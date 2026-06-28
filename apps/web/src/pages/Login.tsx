import { useEffect, useState } from 'react';
import { api, auth } from '../api';
import { Button, Field, GlassBackground, Input, colors, glass } from '../ui';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

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

  // Détecte un lien de réinitialisation : ...?reset=TOKEN
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('reset');
    if (t) {
      setResetToken(t);
      setMode('reset');
    }
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
        const res = await api.register({ email, password, companyName, firstName });
        auth.token = res.token;
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

  const titles: Record<Mode, string> = {
    login: 'Connectez-vous à votre espace',
    register: 'Créez votre standard en 1 minute',
    forgot: 'Réinitialiser votre mot de passe',
    reset: 'Choisissez un nouveau mot de passe',
  };

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
      <div className="fade-up" style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
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
          <form onSubmit={submit}>
            {mode === 'register' && (
              <>
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
                    ? 'Créer mon compte'
                    : mode === 'forgot'
                      ? 'Envoyer le lien'
                      : 'Changer mon mot de passe'}
            </Button>
          </form>
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
