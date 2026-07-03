import { useEffect, useState } from 'react';
import { api, auth } from '../api';
import { Button, Field, GlassBackground, Input, colors, glass } from '../ui';

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'welcome';

// Formules affichées dans le tunnel d'inscription (remplacées par l'API)
const FALLBACK_PLANS = [
  { key: 'essentiel', name: 'Essentiel', monthlyPrice: 14.99 },
  { key: 'pro', name: 'Pro', monthlyPrice: 29 },
  { key: 'business', name: 'Business', monthlyPrice: 49 },
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
        // Forfait de l'URL inconnu → on présélectionne la formule du milieu
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
        // Paiement en ligne dispo ? → étape « Bienvenue » avec activation de
        // l'abonnement. Sinon on entre directement dans l'espace (essai).
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
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      setError(res?.error || "L'abonnement en ligne est momentanément indisponible.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubLoading(false);
    }
  }

  const titles: Record<Mode, string> = {
    login: 'Connectez-vous à votre espace',
    register: 'Créez votre ligne pro en 2 minutes',
    forgot: 'Réinitialiser votre mot de passe',
    reset: 'Choisissez un nouveau mot de passe',
    welcome: 'Votre compte est prêt 🎉',
  };

  const chosenPlan = plans.find((p) => p.key === plan);
  const priceOf = (n: number) =>
    n?.toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0 });

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        position: 'relative',
      }}
    >
      <GlassBackground />
      <div className="fade-up" style={{ width: '100%', maxWidth: mode === 'register' ? 460 : 400, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 18,
              background: colors.primaryGrad,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              boxShadow: '0 10px 24px rgba(0,122,255,0.35)',
              marginBottom: 12,
            }}
          >
            📞
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Joe</h1>
          <p style={{ color: colors.muted, marginTop: 2, fontSize: 13, fontWeight: 600 }}>Ta ligne pro</p>
          <p style={{ color: colors.muted, marginTop: 6, fontSize: 15 }}>{titles[mode]}</p>
        </div>

        <div style={{ ...glass, borderRadius: 22, padding: 24 }}>
          {mode === 'welcome' ? (
            /* ===== Étape post-inscription : essai lancé + abonnement ===== */
            <div style={{ textAlign: 'center' }}>
              <div style={{ background: colors.greenSoft, color: '#1a7f37', padding: '12px 14px', borderRadius: 12, fontSize: 14.5, fontWeight: 600, lineHeight: 1.5 }}>
                ✅ Votre essai gratuit de 14 jours commence maintenant.
                <br />Aucun débit avant la fin de l'essai.
              </div>
              {chosenPlan && (
                <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.7)', border: `1px solid ${colors.border}`, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, color: colors.muted, fontWeight: 600 }}>Votre forfait</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                    <strong style={{ fontSize: 17 }}>{chosenPlan.name}</strong>
                    <span style={{ fontWeight: 800, fontSize: 17 }}>
                      {priceOf(chosenPlan.monthlyPrice)} €<span style={{ color: colors.muted, fontSize: 13, fontWeight: 600 }}>/mois</span>
                    </span>
                  </div>
                </div>
              )}
              {error && (
                <div style={{ background: colors.redSoft, color: colors.red, padding: '10px 12px', borderRadius: 10, fontSize: 14, marginTop: 14 }}>
                  ⚠️ {error}
                </div>
              )}
              {billingEnabled && (
                <Button
                  onClick={activateSubscription}
                  disabled={subLoading}
                  full
                  style={{ padding: 14, fontSize: 16, marginTop: 18 }}
                >
                  {subLoading ? '…' : `💳 Activer mon abonnement`}
                </Button>
              )}
              <button
                onClick={onLoggedIn}
                style={{
                  marginTop: 12, width: '100%', padding: 13, borderRadius: 12, border: 'none',
                  background: 'rgba(0,0,0,0.05)', color: colors.text, fontWeight: 700, fontSize: 15, cursor: 'pointer',
                }}
              >
                Découvrir mon espace →
              </button>
              <p style={{ color: colors.muted, fontSize: 12.5, marginTop: 14, marginBottom: 0, lineHeight: 1.5 }}>
                Sans engagement — résiliable à tout moment depuis votre espace.
              </p>
            </div>
          ) : (
            <form onSubmit={submit}>
              {mode === 'register' && (
                <>
                  {/* Choix du forfait (présélectionné depuis le site) */}
                  <Field label="Votre forfait">
                    <div style={{ display: 'flex', gap: 8 }}>
                      {plans.map((p) => {
                        const on = p.key === plan;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => setPlan(p.key)}
                            style={{
                              flex: 1, padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
                              border: on ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                              background: on ? 'rgba(0,122,255,0.08)' : 'rgba(255,255,255,0.7)',
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: 14, color: on ? colors.primary : colors.text }}>{p.name}</div>
                            <div style={{ fontSize: 12.5, color: colors.muted, marginTop: 2 }}>
                              {priceOf(p.monthlyPrice)} €/mois
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Nom de l'entreprise">
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                  </Field>
                  <Field label="Prénom">
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </Field>
                </>
              )}

              {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
                <Field label="Email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Field>
              )}

              {(mode === 'login' || mode === 'register' || mode === 'reset') && (
                <Field label={mode === 'reset' ? 'Nouveau mot de passe' : 'Mot de passe'}>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="8 caractères minimum"
                  />
                </Field>
              )}

              {error && (
                <div style={{ background: colors.redSoft, color: colors.red, padding: '10px 12px', borderRadius: 10, fontSize: 14, marginBottom: 14 }}>
                  ⚠️ {error}
                </div>
              )}
              {info && (
                <div style={{ background: colors.greenSoft, color: '#1a7f37', padding: '10px 12px', borderRadius: 10, fontSize: 14, marginBottom: 14 }}>
                  {info}
                </div>
              )}
              {devUrl && (
                <div style={{ background: '#eef0ff', color: colors.primary, padding: '10px 12px', borderRadius: 10, fontSize: 13, marginBottom: 14, wordBreak: 'break-all' }}>
                  Email non configuré — lien direct :{' '}
                  <a href={devUrl} style={{ color: colors.primary, fontWeight: 700 }}>réinitialiser ici</a>
                </div>
              )}

              <Button type="submit" disabled={loading} full style={{ padding: 14, fontSize: 16 }}>
                {loading
                  ? '…'
                  : mode === 'login'
                    ? 'Se connecter'
                    : mode === 'register'
                      ? 'Créer mon compte — essai gratuit 14 jours'
                      : mode === 'forgot'
                        ? 'Envoyer le lien'
                        : 'Changer mon mot de passe'}
              </Button>
              {mode === 'register' && (
                <p style={{ color: colors.muted, fontSize: 12.5, textAlign: 'center', margin: '12px 0 0', lineHeight: 1.5 }}>
                  Sans carte bancaire · Sans engagement
                </p>
              )}
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: colors.muted }}>
          {mode === 'login' && (
            <>
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('forgot'); setError(null); setInfo(null); }} style={{ color: colors.primary, fontWeight: 600 }}>
                Mot de passe oublié ?
              </a>
              <div style={{ marginTop: 10 }}>
                Pas de compte ?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setMode('register'); setError(null); }} style={{ color: colors.primary, fontWeight: 700 }}>S'inscrire</a>
              </div>
            </>
          )}
          {(mode === 'register' || mode === 'forgot' || mode === 'reset') && (
            <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); setError(null); setInfo(null); }} style={{ color: colors.primary, fontWeight: 700 }}>
              ← Retour à la connexion
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
