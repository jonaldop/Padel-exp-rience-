import { useState } from 'react';
import { api } from '../api';
import { Button, Card, GlassBackground, Input, colors, glass } from '../ui';
import { formatFr } from '../format';

export function Admin() {
  const [key, setKey] = useState(localStorage.getItem('stp_admin_key') || '');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.adminAccounts(key);
      localStorage.setItem('stp_admin_key', key);
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <GlassBackground />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>🛠️ Back-office admin</h1>
        <p style={{ color: colors.muted }}>Tous les comptes clients de ton SaaS.</p>

        <div style={{ ...glass, borderRadius: 16, padding: 16, display: 'flex', gap: 8, marginBottom: 20 }}>
          <Input
            type="password"
            placeholder="Clé admin"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            style={{ flex: 1 }}
          />
          <Button onClick={load} disabled={loading}>
            {loading ? '…' : 'Voir les comptes'}
          </Button>
        </div>

        {error && (
          <div style={{ background: colors.redSoft, color: colors.red, padding: 12, borderRadius: 10, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {data && (
          <>
            <p style={{ fontWeight: 700, fontSize: 18 }}>{data.count} compte(s)</p>
            <div style={{ display: 'grid', gap: 12 }}>
              {data.accounts.map((a: any) => (
                <Card key={a.id} style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{a.entreprise || '—'}</div>
                      <div style={{ fontSize: 14, color: colors.text, marginTop: 4 }}>
                        📧 {a.emails.join(', ') || '—'}
                      </div>
                      <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                        ☎️ {a.numeros.map((n: string) => formatFr(n)).join(', ') || 'aucun numéro'}
                      </div>
                      <div style={{ fontSize: 12.5, color: colors.muted, marginTop: 4 }}>
                        {a.nbAppels} appel(s) · {a.nbClients} client(s) · créé le{' '}
                        {new Date(a.créé).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color: colors.primary }}>{a.plan}</div>
                      <div style={{ fontSize: 12.5, color: colors.muted }}>{a.statut}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        <p style={{ marginTop: 24 }}>
          <a href="/" style={{ color: colors.primary }}>← Retour à l'app</a>
        </p>
      </div>
    </div>
  );
}
