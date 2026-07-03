import { useEffect, useState } from 'react';
import { api, auth } from '../api';
import '../auth.css';

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'welcome';

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
      setMode('register');
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
        try {
          const b = await api.billingStatus();
          if (b?.enabled) {
            setBillingEnabled(true);
            setMode('welcome');
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }
        } catch { /* billing indisponible → on continue */ }
        onLoggedIn();
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
    register: { h: 'Créez votre ligne pro', p: 'Essai gratuit 14 jours — sans carte bancaire.' },
    forgot: { h: 'Mot de passe oublié', p: 'On vous envoie un lien de réinitialisation.' },
    reset: { h: 'Nouveau mot de passe', p: 'Choisissez un mot de passe sécurisé.' },
    welcome: { h: 'Votre compte est prêt 🎉', p: 'Votre essai gratuit vient de démarrer.' },
  };

  const goMode = (m: Mode) => { setMode(m); setError(null); setInfo(null); };

  // Copie du panneau de gauche selon le contexte
  const brandCopy = mode === 'login'
    ? { h: 'Votre ligne pro vous attend.', s: 'Vos appels, vos messages et vos clients, réunis dans une seule application.' }
    : { h: 'La ligne pro des artisans et indépendants.', s: 'Un vrai numéro professionnel, prêt en 5 minutes. Testez 14 jours, gratuitement.' };

  return (
    <div className="au">
      {/* ===== Panneau de marque (gauche) ===== */}
      <aside className="au-brand">
        <div className="au-brand-logo">
          <span className="au-brand-logo-mark">📞</span> Joe
        </div>
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
          {/* Logo visible en mobile (panneau gauche masqué) */}
          <div className="au-mobile-logo">
            <div className="mark">📞</div>
            <div className="name">Joe</div>
            <div className="tag">Ta ligne pro</div>
          </div>

          <div className="au-card-head">
            <h2>{heads[mode].h}</h2>
            <p>{heads[mode].p}</p>
          </div>

          {/* Onglets Connexion / Inscription (uniquement sur ces 2 modes) */}
          {(mode === 'login' || mode === 'register') && (
            <div className="au-tabs">
              <button className={`au-tab${mode === 'login' ? ' on' : ''}`} onClick={() => goMode('login')} type="button">
                Se connecter
              </button>
              <button className={`au-tab${mode === 'register' ? ' on' : ''}`} onClick={() => goMode('register')} type="button">
                S’inscrire
              </button>
            </div>
          )}

          {mode === 'welcome' ? (
            /* ===== Étape post-inscription : essai lancé + abonnement ===== */
            <div>
              <div className="au-alert ok">
                ✅ Votre essai gratuit de 14 jours commence maintenant. Aucun débit avant la fin de l’essai.
              </div>
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
                  {subLoading ? '…' : '💳 Activer mon abonnement'}
                </button>
              )}
              <button className="au-btn-soft" onClick={onLoggedIn} style={{ marginTop: 12 }}>
                Découvrir mon espace →
              </button>
              <p className="au-reassure">Sans engagement — résiliable à tout moment depuis votre espace.</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              {mode === 'register' && (
                <>
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
                      ? 'Commencer l’essai gratuit'
                      : mode === 'forgot'
                        ? 'Envoyer le lien'
                        : 'Changer mon mot de passe'}
              </button>

              {mode === 'register' && (
                <p className="au-reassure">✓ Sans carte bancaire &nbsp;·&nbsp; ✓ Sans engagement &nbsp;·&nbsp; ✓ Résiliable en 1 clic</p>
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
