import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, Card, IconChip, PageTitle, colors } from '../ui';

interface Call {
  id: string;
  direction: string;
  fromE164: string;
  toE164: string;
  status: string;
  startedAt: string;
  durationS?: number | null;
}

const statusMeta: Record<string, { txt: string; color: string; bg: string }> = {
  completed: { txt: 'Terminé', color: colors.green, bg: colors.greenSoft },
  answered: { txt: 'Répondu', color: colors.green, bg: colors.greenSoft },
  missed: { txt: 'Manqué', color: colors.red, bg: colors.redSoft },
  voicemail: { txt: 'Messagerie', color: colors.amber, bg: colors.amberSoft },
  forwarded: { txt: 'Renvoyé', color: colors.primary, bg: '#eef0ff' },
  ringing: { txt: 'En cours', color: colors.muted, bg: colors.soft },
  failed: { txt: 'Échec', color: colors.red, bg: colors.redSoft },
};

export function Dashboard({ companyName }: { companyName?: string }) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.history().then(setCalls).finally(() => setLoading(false));
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
      <PageTitle subtitle={companyName ? `Bonjour, ${companyName} 👋` : undefined}>Accueil</PageTitle>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        <Kpi icon="📞" tint="#eef0ff" iconColor={colors.primary} label="Appels" value={total} />
        <Kpi icon="✅" tint={colors.greenSoft} iconColor={colors.green} label="Répondus" value={answered} />
        <Kpi icon="📵" tint={colors.redSoft} iconColor={colors.red} label="Manqués" value={missed} />
        <Kpi icon="⏱️" tint={colors.amberSoft} iconColor={colors.amber} label="Durée moy." value={`${avgDur}s`} />
      </div>

      <h3 style={{ marginBottom: 12, fontSize: 17 }}>Historique des appels</h3>
      {loading ? (
        <p style={{ color: colors.muted }}>Chargement…</p>
      ) : calls.length === 0 ? (
        <Card>
          <p style={{ color: colors.muted, margin: 0, lineHeight: 1.5 }}>
            Aucun appel pour le moment. Dès que votre numéro recevra ou passera des appels, ils
            s'afficheront ici. 📲
          </p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {calls.map((c) => {
            const s = statusMeta[c.status] || { txt: c.status, color: colors.muted, bg: colors.soft };
            const inbound = c.direction === 'inbound';
            return (
              <Card key={c.id} style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <IconChip
                      icon={inbound ? '↙' : '↗'}
                      bg={inbound ? '#eef0ff' : colors.greenSoft}
                      color={inbound ? colors.primary : colors.green}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {inbound ? c.fromE164 : c.toE164}
                      </div>
                      <div style={{ fontSize: 12.5, color: colors.muted }}>
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
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <Badge color={s.color} bg={s.bg}>
                      {s.txt}
                    </Badge>
                    {c.durationS ? (
                      <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{c.durationS}s</div>
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

function Kpi({
  icon,
  tint,
  iconColor,
  label,
  value,
}: {
  icon: string;
  tint: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card style={{ padding: 16 }}>
      <IconChip icon={icon} bg={tint} color={iconColor} />
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 10, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 13, color: colors.muted }}>{label}</div>
    </Card>
  );
}
