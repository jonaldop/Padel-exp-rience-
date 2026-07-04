import { useEffect, useState } from 'react';
import { api, auth } from '../api';
import { formatFr } from '../format';
import '../auth.css';

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'pick' | 'number' | 'welcome';

// Types de numéros proposés à l'inscription (les 06/07 n'existent pas en VoIP)
const NUM_TYPES = [
  { key: 'geographic', label: 'Régional (01-05)' },
  { key: 'non_geo', label: 'National (09)' },
];

// Formules affichées dans le tunnel d'inscription (remplacées par l'API)
const FALLBACK_PLANS = [
  { key: 'essentiel', name: 'Essentiel', monthlyPrice: 14.99 },
  { key: 'pro', name: 'Pro', monthlyPrice: 29 },
  { key: 'business', name: 'Business', monthlyPrice: 49 },
];

// Arguments de vente du panneau de gauche (varient selon connexion / inscription)
const BENEFITS = [
  { ic: '📞', t: 'Un vrai numéro pro', s: 'Sur le téléphone que vous avez déjà. Sans 2ᵉ mobile ni carte SIM.' },
  { ic: '🎙️', t: 'Répondeur & transcription', s: 'Chaque message vocal transcrit en texte, prêt à lire.' },
  { ic: '🕓', t: 'Vous coupez le soir', s: 'Horaires d’ouverture : Joe répond pour vous hors service.' },
];

export function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Tunnel site commercial : forfait choisi + abonnement Stripe après création
  const [plans, setPlans] = useState<any[]>(FALLBACK_PLANS);
  const [plan, setPlan] = useState<string>('pro');
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  // Étape "choisissez votre numéro" (juste après la création du compte)
  const [numType, setNumType] = useState('geographic');
  const [numContains, setNumContains] = useState('');
  const [numAvailable, setNumAvailable] = useState<any[]>([]);
  const [numLoading, setNumLoading] = useState(false);
  const [numBuying, setNumBuying] = useState<string | null>(null);
  const [chosenNumber, setChosenNumber] = useState<string | null>(null);
  // Numéro choisi AVANT la création du compte (réservé au moment de l'inscription)
  const [draftNumber, setDraftNumber] = useState<any | null>(null);

  // Détecte un lien de réinitialisation (…?reset=TOKEN) ou une arrivée depuis
  // le site commercial (…?signup=1&plan=pro).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('reset');
    if (t) {
      setResetToken(t);
      setMode('reset');
      return;
    }
    if (params.has('signup')) {
      // Inscription : le client choisit d'abord SON numéro (étape 1), le
      // compte vient après — le numéro est réservé à la création.
      setMode('pick');
      loadNumbers('geographic', '');
      const p = params.get('plan');
      if (p) setPlan(p);
    }
    api.plans().then((r) => {
      if (r?.plans?.length) {
        setPlans(r.plans);
        const fromUrl = params.get('plan');
        if (!r.plans.some((x: any) => x.key === fromUrl)) {
          setPlan(r.plans[Math.min(1, r.plans.length - 1)].key);
        }
      }
    }).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setDevUrl(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        auth.token = res.token;
        onLoggedIn();
      } else if (mode === 'register') {
        const res = await api.register({ email, password, companyName, firstName, plan });
        auth.token = res.token;
        let billingOn = false;
        try {
          const b = await api.billingStatus();
          billingOn = Boolean(b?.enabled);
          setBillingEnabled(billingOn);
        } catch { /* billing indisponible → on continue */ }
        window.history.replaceState({}, '', window.location.pathname);
        if (draftNumber) {
          // PAIEMENT D'ABORD : quand Stripe est branché, le numéro est réservé
          // et acheté automatiquement après le paiement de l'abonnement.
          try {
            const r = billingOn
              ? await api.reserveNumber(draftNumber.e164, draftNumber.type)
              : await api.buyNumber(draftNumber.e164, draftNumber.type);
            if (!r?.error || r?.reserved) {
              setChosenNumber(draftNumber.e164);
              setMode('welcome');
              return;
            }
          } catch { /* numéro pris entre-temps → on repropose */ }
          setDraftNumber(null);
          setError('Ce numéro vient d’être pris — choisissez-en un autre 👇');
          setMode('number');
          loadNumbers(numType, numContains);
        } else {
          // Pas de numéro choisi : on le propose maintenant.
          setMode('number');
          loadNumbers('geographic', '');
        }
      } else if (mode === 'forgot') {
        const res = await api.forgot(email);
        setInfo('Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.');
        if (res.devResetUrl) setDevUrl(res.devResetUrl);
      } else if (mode === 'reset') {
        await api.reset(resetToken, password);
        setInfo('✅ Mot de passe modifié ! Vous pouvez vous connecter.');
        setMode('login');
        setPassword('');
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /** Recherche des numéros disponibles (étape post-inscription). */
  async function loadNumbers(t = numType, c = numContains) {
    setNumLoading(true);
    try {
      setNumAvailable(await api.availableNumbers(t, c));
    } catch {
      setNumAvailable([]);
    } finally {
      setNumLoading(false);
    }
  }

  /** Réserve/achète le numéro choisi (post-inscription) et passe à la bienvenue. */
  async function chooseNumber(a: any) {
    setError(null);
    setNumBuying(a.e164);
    try {
      // Stripe branché -> simple réservation (achat après paiement).
      const r = billingEnabled
        ? await api.reserveNumber(a.e164, a.type)
        : await api.buyNumber(a.e164, a.type);
      if (r?.error && !r?.reserved) { setError(r.error); return; }
      setChosenNumber(a.e164);
      setMode('welcome');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setNumBuying(null);
    }
  }

  /** Active le prélèvement automatique (redirige vers Stripe Checkout). */
  async function activateSubscription() {
    setError(null);
    setSubLoading(true);
    try {
      const res = await api.subscribe();
      if (res?.url) { window.location.href = res.url; return; }
      setError(res?.error || "L'abonnement en ligne est momentanément indisponible.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubLoading(false);
    }
  }

  const chosenPlan = plans.find((p) => p.key === plan);
  const priceOf = (n: number) => n?.toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0 });

  const heads: Record<Mode, { h: string; p: string }> = {
    login: { h: 'Bon retour 👋', p: 'Connectez-vous à votre espace Joe.' },
    register: { h: 'Créez votre ligne pro', p: 'Votre numéro est mis en service dès le paiement.' },
    forgot: { h: 'Mot de passe oublié', p: 'On vous envoie un lien de réinitialisation.' },
    reset: { h: 'Nouveau mot de passe', p: 'Choisissez un mot de passe sécurisé.' },
    pick: { h: 'Choisissez votre numéro 📞', p: 'Étape 1 sur 2 — il sera réservé dès la création de votre compte.' },
    number: { h: 'Choisissez votre numéro 📞', p: 'Votre futur numéro pro — réservé instantanément.' },
    welcome: {
      h: 'Votre compte est prêt 🎉',
      p: billingEnabled
        ? 'Plus qu’une étape : activez votre abonnement pour mettre votre ligne en service.'
        : 'Votre essai vient de démarrer.',
    },
  };

  const goMode = (m: Mode) => { setMode(m); setError(null); setInfo(null); };

  /** Entrée dans l'inscription : numéro d'abord (sauf s'il est déjà choisi). */
  const goSignup = () => {
    setError(null);
    setInfo(null);
    if (draftNumber) { setMode('register'); return; }
    setMode('pick');
    if (!numAvailable.length) loadNumbers('geographic', '');
  };

  /** Depuis le formulaire : revenir changer le numéro choisi. */
  const goSignupChange = () => {
    setError(null);
    setMode('pick');
    if (!numAvailable.length) loadNumbers('geographic', '');
  };

  // Copie du panneau de gauche selon le contexte
  const brandCopy = mode === 'login'
    ? { h: 'Votre ligne pro vous attend.', s: 'Vos appels, vos messages et vos clients, réunis dans une seule application.' }
    : { h: 'La ligne pro des artisans et indépendants.', s: 'Un vrai numéro professionnel, prêt en 5 minutes. Sans engagement.' };

  return (
    <div className="au">
      {/* ===== Panneau de marque (gauche) ===== */}
      <aside className="au-brand">
        <a href="/" className="au-brand-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="au-brand-logo-mark"><img src="/mascotte.png" alt="Joe" /></span> Joe
        </a>
        <div className="au-brand-body">
          <h1>{brandCopy.h}</h1>
          <p className="au-brand-sub">{brandCopy.s}</p>
          <ul className="au-benefits">
            {BENEFITS.map((b) => (
              <li key={b.t} className="au-benefit">
                <span className="au-benefit-ic">{b.ic}</span>
                <div><strong>{b.t}</strong><span>{b.s}</span></div>
              </li>
            ))}
          </ul>
          <div className="au-proof">
            <span className="au-stars">★★★★★</span>
            <span className="au-proof-txt">« Enfin séparé le pro du perso. Mes clients me joignent, je coupe le soir. »<br />— un artisan comme vous</span>
          </div>
        </div>
      </aside>

      {/* ===== Colonne formulaire (droite) ===== */}
      <main className="au-form-side">
        <div className="au-card">
          {/* Retour au site commercial (toujours visible) */}
          <a href="/" className="au-back">← Retour au site</a>

          {/* Logo visible en mobile (panneau gauche masqué) */}
          <a href="/" className="au-mobile-logo">
            <div className="mark"><img src="/mascotte.png" alt="Joe" /></div>
            <div className="name">Joe</div>
            <div className="tag">Ta ligne pro</div>
          </a>

          <div className="au-card-head">
            <h2>{heads[mode].h}</h2>
            <p>{heads[mode].p}</p>
          </div>

          {/* Onglets Connexion / Inscription */}
          {(mode === 'login' || mode === 'register' || mode === 'pick') && (
            <div className="au-tabs">
              <button className={`au-tab${mode === 'login' ? ' on' : ''}`} onClick={() => goMode('login')} type="button">
                Se connecter
              </button>
              <button className={`au-tab${mode !== 'login' ? ' on' : ''}`} onClick={goSignup} type="button">
                S’inscrire
              </button>
            </div>
          )}

          {mode === 'pick' || mode === 'number' ? (
            /* ===== Choix du numéro pro (étape 1 avant compte, ou repli après) ===== */
            <div>
              {mode === 'number' && !error && (
                <div className="au-alert ok">✅ Compte créé ! Dernière étape : votre numéro professionnel.</div>
              )}

              <div className="au-field" style={{ marginTop: 14 }}>
                <label>Type de numéro</label>
                <div className="au-numtypes">
                  {NUM_TYPES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      className={`au-numtype${numType === t.key ? ' on' : ''}`}
                      onClick={() => { setNumType(t.key); loadNumbers(t.key, numContains); }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="au-field">
                <label>Envie d’un numéro facile à retenir ? (optionnel)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="au-input"
                    value={numContains}
                    onChange={(e) => setNumContains(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loadNumbers(); } }}
                    placeholder="Chiffres : 01, 4242, 0000…"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="au-btn-soft" style={{ marginTop: 0, width: 'auto', padding: '0 18px' }} onClick={() => loadNumbers()}>
                    🔍
                  </button>
                </div>
              </div>

              {error && <div className="au-alert err">⚠️ {error}</div>}

              {numLoading ? (
                <p style={{ color: '#7a7f9a', textAlign: 'center', margin: '18px 0' }}>Recherche de numéros…</p>
              ) : numAvailable.length === 0 ? (
                <div className="au-alert info">Aucun numéro trouvé pour ces critères — essayez d’autres chiffres ou l’autre type.</div>
              ) : (
                <div className="au-numlist">
                  {numAvailable.slice(0, 6).map((a) => (
                    <div key={a.e164} className="au-numrow">
                      <div>
                        <strong>{formatFr(a.e164)}</strong>
                        <span>Inclus dans votre forfait</span>
                      </div>
                      <button
                        type="button"
                        className="au-num-choose"
                        disabled={numBuying !== null}
                        onClick={() => {
                          if (mode === 'pick') {
                            // Avant le compte : on mémorise le choix, réservation à l'inscription.
                            setDraftNumber(a);
                            setError(null);
                            setMode('register');
                          } else {
                            chooseNumber(a);
                          }
                        }}
                      >
                        {numBuying === a.e164 ? '…' : 'Choisir'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="au-foot">
                {mode === 'pick' ? (
                  <button type="button" className="au-link" onClick={() => { setDraftNumber(null); setMode('register'); }}>
                    Choisir mon numéro plus tard →
                  </button>
                ) : (
                  <button type="button" className="au-link" onClick={() => setMode('welcome')}>
                    Choisir mon numéro plus tard →
                  </button>
                )}
              </div>
            </div>
          ) : mode === 'welcome' ? (
            /* ===== Étape post-inscription : activation de l'abonnement ===== */
            <div>
              <div className="au-alert ok">
                {billingEnabled
                  ? '✅ Compte créé ! Votre numéro est réservé — il est mis en service dès le paiement.'
                  : '✅ Votre compte est créé.'}
              </div>
              {chosenNumber && (
                <div className="au-welcome-plan" style={{ marginTop: 12 }}>
                  <div className="lbl">{billingEnabled ? 'Votre numéro (réservé pour vous)' : 'Votre numéro pro'}</div>
                  <div className="row"><strong>📞 {formatFr(chosenNumber)}</strong></div>
                </div>
              )}
              {chosenPlan && (
                <div className="au-welcome-plan">
                  <div className="lbl">Votre forfait</div>
                  <div className="row">
                    <strong>{chosenPlan.name}</strong>
                    <span className="price">{priceOf(chosenPlan.monthlyPrice)} €<small>/mois</small></span>
                  </div>
                </div>
              )}
              {error && <div className="au-alert err" style={{ marginTop: 14 }}>⚠️ {error}</div>}
              {billingEnabled && (
                <button className="au-btn" onClick={activateSubscription} disabled={subLoading} style={{ marginTop: 18 }}>
                  {subLoading
                    ? '…'
                    : `💳 Payer ${chosenPlan ? `${priceOf(chosenPlan.monthlyPrice)} €/mois` : ''} et activer ma ligne`}
                </button>
              )}
              <button className="au-btn-soft" onClick={onLoggedIn} style={{ marginTop: 12 }}>
                {billingEnabled ? 'Plus tard — découvrir mon espace →' : 'Découvrir mon espace →'}
              </button>
              <p className="au-reassure">Sans engagement — résiliable à tout moment depuis votre espace.</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              {mode === 'register' && (
                <>
                  {draftNumber && (
                    <div className="au-draftnum">
                      <div>
                        <div className="lbl">Votre numéro</div>
                        <strong>📞 {formatFr(draftNumber.e164)}</strong>
                      </div>
                      <button type="button" className="au-link" onClick={goSignupChange}>
                        Changer
                      </button>
                    </div>
                  )}
                  <div className="au-field">
                    <label>Votre forfait</label>
                    <div className="au-plans">
                      {plans.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          className={`au-plan${p.key === plan ? ' on' : ''}`}
                          onClick={() => setPlan(p.key)}
                        >
                          <div className="au-plan-name">{p.name}</div>
                          <div className="au-plan-price">{priceOf(p.monthlyPrice)} €/mois</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="au-field">
                    <label>Nom de l’entreprise</label>
                    <input className="au-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="Ex : Plomberie Durand" />
                  </div>
                  <div className="au-field">
                    <label>Prénom</label>
                    <input className="au-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ex : Martin" />
                  </div>
                </>
              )}

              {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
                <div className="au-field">
                  <label>Email</label>
                  <input className="au-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="vous@entreprise.fr" />
                </div>
              )}

              {(mode === 'login' || mode === 'register' || mode === 'reset') && (
                <div className="au-field">
                  <label>{mode === 'reset' ? 'Nouveau mot de passe' : 'Mot de passe'}</label>
                  <input
                    className="au-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="8 caractères minimum"
                  />
                </div>
              )}

              {mode === 'login' && (
                <div style={{ textAlign: 'right', marginTop: -4, marginBottom: 14 }}>
                  <button type="button" className="au-link" style={{ fontSize: 13 }} onClick={() => goMode('forgot')}>
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {error && <div className="au-alert err">⚠️ {error}</div>}
              {info && <div className="au-alert ok">{info}</div>}
              {devUrl && (
                <div className="au-alert info">
                  Email non configuré — <a href={devUrl}>réinitialiser ici</a>
                </div>
              )}

              <button type="submit" className="au-btn" disabled={loading}>
                {loading
                  ? '…'
                  : mode === 'login'
                    ? 'Se connecter'
                    : mode === 'register'
                      ? draftNumber
                        ? 'Réserver mon numéro'
                        : 'Créer mon compte'
                      : mode === 'forgot'
                        ? 'Envoyer le lien'
                        : 'Changer mon mot de passe'}
              </button>

              {mode === 'register' && (
                <p className="au-reassure">✓ Sans engagement &nbsp;·&nbsp; ✓ Résiliable en 1 clic &nbsp;·&nbsp; ✓ Paiement sécurisé Stripe</p>
              )}

              {(mode === 'forgot' || mode === 'reset') && (
                <div className="au-foot">
                  <button type="button" className="au-link" onClick={() => goMode('login')}>← Retour à la connexion</button>
                </div>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
