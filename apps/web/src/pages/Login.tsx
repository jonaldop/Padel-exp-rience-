import { useState } from 'react';
import { api, auth } from '../api';
import { Button, Card, Field, Input, colors } from '../ui';

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
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bg,
        fontFamily: 'system-ui, sans-serif',
        padding: 16,
      }}
    >
      <Card style={{ width: 380 }}>
        <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>📞 Standard Pro</h1>
        <p style={{ color: colors.muted, marginTop: 0 }}>
          {mode === 'login' ? 'Connexion à votre espace' : 'Créer votre compte entreprise'}
        </p>

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
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Mot de passe">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </Field>

          {error && <p style={{ color: colors.red, fontSize: 14 }}>⚠️ {error}</p>}

          <Button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14 }}>
          {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà inscrit ?'}{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            style={{ color: colors.primary }}
          >
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </a>
        </p>
      </Card>
    </div>
  );
}
