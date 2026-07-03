import { useEffect, useState } from 'react';
import { api } from '../api';
import { Card, IconChip, PageTitle, colors } from '../ui';
import { formatFr } from '../format';

interface Voicemail {
  id: string;
  audioUrl?: string | null;
  transcriptionText?: string | null;
  transcriptionStatus: string;
  aiCategory?: string | null;
  aiUrgency?: string | null;
  aiSummary?: string | null;
  createdAt: string;
  call?: { fromE164: string };
}

// Secrétariat IA : badges de qualification
const CAT: Record<string, { label: string; color: string; bg: string }> = {
  devis: { label: '🛠️ Devis', color: '#1d6ae5', bg: '#E8EEFF' },
  urgence: { label: '🚨 Urgence', color: '#d1352b', bg: '#FDEBEA' },
  rdv: { label: '📅 Rendez-vous', color: '#7C5CF0', bg: '#F3EAFF' },
  rappel: { label: '📞 Rappel', color: '#1a7f37', bg: '#E7F7EE' },
};

function CatBadge({ vm }: { vm: Voicemail }) {
  const cat = vm.aiCategory ? CAT[vm.aiCategory] : null;
  if (!cat && vm.aiUrgency !== 'haute') return null;
  return (
    <span style={{ display: 'inline-flex', gap: 6, marginLeft: 8 }}>
      {cat && (
        <span style={{ background: cat.bg, color: cat.color, fontSize: 12, fontWeight: 800, padding: '3px 9px', borderRadius: 8 }}>
          {cat.label}
        </span>
      )}
      {vm.aiUrgency === 'haute' && (
        <span style={{ background: '#FDEBEA', color: colors.red, fontSize: 12, fontWeight: 800, padding: '3px 9px', borderRadius: 8 }}>
          ⚡ Urgent
        </span>
      )}
    </span>
  );
}

export function Voicemails() {
  const [items, setItems] = useState<Voicemail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.voicemails().then(setItems).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageTitle subtitle="Les messages laissés sur votre répondeur">Messages vocaux</PageTitle>

      {loading ? (
        <p style={{ color: colors.muted }}>Chargement…</p>
      ) : items.length === 0 ? (
        <Card>
          <p style={{ color: colors.muted, margin: 0, lineHeight: 1.5 }}>
            Aucun message vocal pour le moment. 🎙️
            <br />
            Quand un appelant laisse un message sur votre répondeur, vous pourrez l'écouter ici.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((vm) => (
            <Card key={vm.id} style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <IconChip icon="🎙️" bg={colors.amberSoft} color={colors.amber} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {vm.call ? formatFr(vm.call.fromE164) : 'Appelant inconnu'}
                    <CatBadge vm={vm} />
                  </div>
                  <div style={{ fontSize: 12.5, color: colors.muted }}>
                    {new Date(vm.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>

              {vm.aiSummary && (
                <p style={{ margin: '0 0 12px', fontSize: 14.5, fontWeight: 700, background: '#F3F0FF', padding: '10px 12px', borderRadius: 10 }}>
                  🤖 {vm.aiSummary}
                </p>
              )}
              {vm.audioUrl ? (
                <audio controls src={vm.audioUrl} style={{ width: '100%' }} />
              ) : (
                <div style={{ fontSize: 13, color: colors.muted }}>Enregistrement en cours de traitement…</div>
              )}

              {vm.transcriptionText ? (
                <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, background: colors.soft, padding: 12, borderRadius: 10 }}>
                  « {vm.transcriptionText} »
                </p>
              ) : (
                <p style={{ marginTop: 10, fontSize: 12.5, color: colors.muted }}>
                  📝 Pas de transcription pour ce message.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
