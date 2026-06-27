import { useEffect, useState } from 'react';
import { api } from '../api';
import { Card, IconChip, PageTitle, colors } from '../ui';
import { formatFr } from '../format';

interface Voicemail {
  id: string;
  audioUrl?: string | null;
  transcriptionText?: string | null;
  transcriptionStatus: string;
  createdAt: string;
  call?: { fromE164: string };
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
                  </div>
                  <div style={{ fontSize: 12.5, color: colors.muted }}>
                    {new Date(vm.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>

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
                  📝 Transcription automatique du message : bientôt disponible.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
