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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 20 }}>
        <Kpi label="Appels totaux" value={total} />
        <Kpi label="Répondus" value={answered} color={colors.green} />
        <Kpi label="Manqués" value={missed} color={colors.red} />
        <Kpi label="Durée moy." value={`${avgDur}s`} />
      </div>

      <Card>
        <h3 style={{ marginTop: 0 }}>Historique des appels</h3>
        {loading ? (
          <p style={{ color: colors.muted }}>Chargement…</p>
        ) : calls.length === 0 ? (
          <p style={{ color: colors.muted }}>Aucun appel pour le moment.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: colors.muted }}>
                <th style={{ padding: 8 }}>Sens</th>
                <th style={{ padding: 8 }}>De / Vers</th>
                <th style={{ padding: 8 }}>Statut</th>
                <th style={{ padding: 8 }}>Durée</th>
                <th style={{ padding: 8 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => {
                const s = statusLabel[c.status] || { txt: c.status, color: colors.muted };
                return (
                  <tr key={c.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={{ padding: 8 }}>{c.direction === 'inbound' ? '⬇️ Entrant' : '⬆️ Sortant'}</td>
                    <td style={{ padding: 8 }}>{c.direction === 'inbound' ? c.fromE164 : c.toE164}</td>
                    <td style={{ padding: 8, color: s.color, fontWeight: 600 }}>{s.txt}</td>
                    <td style={{ padding: 8 }}>{c.durationS ? `${c.durationS}s` : '—'}</td>
                    <td style={{ padding: 8, color: colors.muted }}>
                      {new Date(c.startedAt).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || colors.text }}>{value}</div>
      <div style={{ fontSize: 13, color: colors.muted }}>{label}</div>
    </Card>
  );
}
