import { useState } from 'react';
import { api, auth } from '../api';
import { Button, Field, GlassBackground, Input, colors, glass } from '../ui';

export function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register({ email, password, companyName, firstName });
      auth.token = res.token;
      onLoggedIn();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
        {/* Logo / marque */}
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
              boxShadow: '0 10px 24px rgba(79,70,229,0.35)',
              marginBottom: 12,
            }}
          >
            📞
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Standard Pro
          </h1>
          <p style={{ color: colors.muted, marginTop: 6, fontSize: 15 }}>
            {mode === 'login'
              ? 'Connectez-vous à votre espace'
              : 'Créez votre standard en 1 minute'}
          </p>
        </div>

        <div
          style={{
            ...glass,
            borderRadius: 22,
            padding: 24,
          }}
        >
          <form onSubmit={submit}>
            {mode === 'register' && (
              <>
                <Field label="Nom de l'entreprise">
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="Plomberie Dupont" />
                </Field>
                <Field label="Prénom">
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Johan" />
                </Field>
              </>
            )}
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="vous@entreprise.fr" />
            </Field>
            <Field label="Mot de passe">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="8 caractères minimum"
              />
            </Field>

            {error && (
              <div
                style={{
                  background: colors.redSoft,
                  color: colors.red,
                  padding: '10px 12px',
                  borderRadius: 10,
                  fontSize: 14,
                  marginBottom: 14,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <Button type="submit" disabled={loading} full style={{ padding: 14, fontSize: 16 }}>
              {loading ? '…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </Button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: colors.muted }}>
          {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà inscrit ?'}{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            style={{ color: colors.primary, fontWeight: 700 }}
          >
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </a>
        </p>
      </div>
    </div>
  );
}
