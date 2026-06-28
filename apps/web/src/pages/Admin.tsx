import { useState } from 'react';
import { api } from '../api';
import { Button, Card, GlassBackground, Input, colors, glass } from '../ui';
import { formatFr } from '../format';

export function Admin() {
  const [key, setKey] = useState(localStorage.getItem('stp_admin_key') || '');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

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

  function toggle(id: string) {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  }

  const mrr =
    data?.accounts?.reduce((s: number, a: any) => s + (a.prixMensuel || 0), 0) || 0;

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
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ ...glass, borderRadius: 12, padding: '10px 16px' }}>
                <div style={{ fontSize: 12.5, color: colors.muted }}>Comptes</div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{data.count}</div>
              </div>
              <div style={{ ...glass, borderRadius: 12, padding: '10px 16px' }}>
                <div style={{ fontSize: 12.5, color: colors.muted }}>Revenu mensuel (MRR)</div>
                <div style={{ fontWeight: 800, fontSize: 20, color: colors.primary }}>
                  {mrr.toFixed(2)} €
                </div>
              </div>
            </div>

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
                        ☎️{' '}
                        {a.numeros.length
                          ? a.numeros.map((n: any) => formatFr(n.e164)).join(', ')
                          : 'aucun numéro'}
                      </div>
                      <div style={{ fontSize: 12.5, color: colors.muted, marginTop: 4 }}>
                        {a.nbAppels} appel(s) · {a.nbClients} client(s) · créé le{' '}
                        {new Date(a.créé).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color: colors.primary }}>
                        {a.plan}
                        {a.prixMensuel != null && (
                          <span style={{ color: colors.muted, fontWeight: 600 }}>
                            {' '}
                            · {a.prixMensuel} €/mois
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          marginTop: 2,
                          fontWeight: 600,
                          color: a.paiementAJour ? colors.green || '#16a34a' : colors.red,
                        }}
                      >
                        {a.paiementAJour ? '✓ ' : '⚠️ '}
                        {a.paiementLibelle}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggle(a.id)}
                    style={{
                      marginTop: 10,
                      background: 'transparent',
                      border: 'none',
                      color: colors.primary,
                      cursor: 'pointer',
                      fontSize: 13,
                      padding: 0,
                    }}
                  >
                    {open[a.id] ? '▲ Masquer les détails' : '▼ Voir les détails (utilisateurs, clients)'}
                  </button>

                  {open[a.id] && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${colors.border || '#eee'}`, paddingTop: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Utilisateurs</div>
                      <div style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
                        {a.utilisateurs?.map((u: any, i: number) => (
                          <div key={i} style={{ fontSize: 13, color: colors.text }}>
                            {u.nom || u.email}{' '}
                            <span style={{ color: colors.muted }}>
                              · {u.email}
                              {u.telPerso ? ` · ${u.telPerso}` : ''} · {u.role}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                        Numéros
                      </div>
                      <div style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
                        {a.numeros.length ? (
                          a.numeros.map((n: any, i: number) => (
                            <div key={i} style={{ fontSize: 13, color: colors.text }}>
                              {formatFr(n.e164)}{' '}
                              <span style={{ color: colors.muted }}>
                                · {n.type} · {n.statut}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: 13, color: colors.muted }}>Aucun numéro</div>
                        )}
                      </div>

                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                        Clients ({a.nbClients})
                      </div>
                      {a.clients?.length ? (
                        <div style={{ display: 'grid', gap: 4 }}>
                          {a.clients.map((c: any, i: number) => (
                            <div key={i} style={{ fontSize: 13, color: colors.text }}>
                              {c.nom}{' '}
                              <span style={{ color: colors.muted }}>
                                · {formatFr(c.tel)}
                                {c.email ? ` · ${c.email}` : ''}
                              </span>
                            </div>
                          ))}
                          {a.nbClients > a.clients.length && (
                            <div style={{ fontSize: 12.5, color: colors.muted }}>
                              … et {a.nbClients - a.clients.length} de plus
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: colors.muted }}>Aucun client</div>
                      )}
                    </div>
                  )}
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
