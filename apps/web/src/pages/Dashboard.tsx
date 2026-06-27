import { useEffect, useState } from 'react';
import { api } from '../api';
import { Card, colors } from '../ui';

interface Call {
  id: string;
  direction: string;
  fromE164: string;
  toE164: string;
  status: string;
  startedAt: string;
  durationS?: number | null;
}

const statusLabel: Record<string, { txt: string; color: string }> = {
  completed: { txt: 'Terminé', color: colors.green },
  answered: { txt: 'Répondu', color: colors.green },
  missed: { txt: 'Manqué', color: colors.red },
  voicemail: { txt: 'Messagerie', color: '#d97706' },
  forwarded: { txt: 'Renvoyé', color: colors.primary },
  ringing: { txt: 'En cours', color: colors.muted },
  failed: { txt: 'Échec', color: colors.red },
};

export function Dashboard() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .history()
      .then(setCalls)
      .finally(() => setLoading(false));
  }, []);

  const total = calls.length;
  const missed = calls.filter((c) => c.status === 'missed').length;
  const answered = calls.filter((c) => ['completed', 'answered'].includes(c.status)).length;
  const avgDur = (() => {
    const withDur = calls.filter((c) => c.durationS);
    if (!withDur.length) return 0;
    return Math.round(withDur.reduce((s, c) => s + (c.durationS || 0), 0) / withDur.length);
  })();

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Tableau de bord</h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Kpi label="Appels" value={total} />
        <Kpi label="Répondus" value={answered} color={colors.green} />
        <Kpi label="Manqués" value={missed} color={colors.red} />
        <Kpi label="Durée moy." value={`${avgDur}s`} />
      </div>

      <h3 style={{ marginBottom: 10 }}>Historique des appels</h3>
      {loading ? (
        <p style={{ color: colors.muted }}>Chargement…</p>
      ) : calls.length === 0 ? (
        <Card>
          <p style={{ color: colors.muted, margin: 0 }}>
            Aucun appel pour le moment. Ils apparaîtront ici dès que votre numéro recevra ou
            passera des appels.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {calls.map((c) => {
            const s = statusLabel[c.status] || { txt: c.status, color: colors.muted };
            const inbound = c.direction === 'inbound';
            return (
              <Card key={c.id} style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{inbound ? '📥' : '📤'}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        {inbound ? c.fromE164 : c.toE164}
                      </div>
                      <div style={{ fontSize: 12, color: colors.muted }}>
                        {inbound ? 'Entrant' : 'Sortant'} ·{' '}
                        {new Date(c.startedAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: s.color, fontWeight: 600, fontSize: 14 }}>{s.txt}</div>
                    {c.durationS ? (
                      <div style={{ fontSize: 12, color: colors.muted }}>{c.durationS}s</div>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || colors.text }}>{value}</div>
      <div style={{ fontSize: 13, color: colors.muted }}>{label}</div>
    </Card>
  );
}
