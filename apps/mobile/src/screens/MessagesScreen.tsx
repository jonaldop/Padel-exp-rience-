import { useCallback, useState } from 'react';
import { Text, FlatList, StyleSheet, RefreshControl, View, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass } from '../ui';
import { formatFr, toE164Fr } from '../format';
import { loadContacts, lookupContact, findContactByNumber, createContact } from '../contacts';
import { playVoicemail } from '../player';

type Segment = 'chats' | 'vocal';

// Secrétariat IA : badges de qualification des messages vocaux
const catMeta: Record<string, { label: string; color: string; bg: string }> = {
  devis: { label: '🛠️ Devis', color: '#1d6ae5', bg: '#E8EEFF' },
  urgence: { label: '🚨 Urgence', color: '#d1352b', bg: '#FDEBEA' },
  rdv: { label: '📅 RDV', color: '#7C5CF0', bg: '#F3EAFF' },
  rappel: { label: '📞 Rappel', color: '#1a7f37', bg: '#E7F7EE' },
};

/** Messagerie : conversations avec les clients + messages du répondeur. */
export function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const [seg, setSeg] = useState<Segment>('chats');
  const [threads, setThreads] = useState<any[]>([]);
  const [vms, setVms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [proNumber, setProNumber] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setLoading(true);
    loadContacts();
    api.myNumbers().then((n: any[]) => setProNumber(n?.[0]?.e164)).catch(() => {});
    Promise.all([
      api.threads().then((t) => setThreads(Array.isArray(t) ? t : [])).catch(() => {}),
      api.voicemails().then((v) => setVms(Array.isArray(v) ? v : [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /** Tap sur un vocal : ouvre la fiche du client (détectée ou créée). */
  async function openClientCard(fromE164?: string) {
    if (!fromE164) return;
    const existing = await findContactByNumber(fromE164);
    if (existing) {
      nav.navigate('FicheContact', { contact: existing });
      return;
    }
    Alert.prompt(
      'Nouveau client',
      `Créer une fiche pour ${formatFr(fromE164)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Créer',
          onPress: async (name?: string) => {
            const c = await createContact((name || '').trim() || formatFr(fromE164), fromE164);
            if (c) nav.navigate('FicheContact', { contact: c });
            else Alert.alert('Impossible', "Autorisez l'accès aux contacts pour créer la fiche.");
          },
        },
      ],
      'plain-text',
    );
  }

  function timeLabel(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return sameDay
      ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  return (
    <GradientBg>
      <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
        <Text style={s.title}>Messagerie</Text>

        {/* Segments */}
        <View style={s.segments}>
          {([['chats', 'Messages'], ['vocal', 'Répondeur']] as [Segment, string][]).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[s.segBtn, seg === key && s.segBtnOn]}
              onPress={() => setSeg(key)}
            >
              <Text style={[s.segTxt, seg === key && s.segTxtOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {seg === 'chats' ? (
          <FlatList
            data={threads}
            keyExtractor={(t) => t.peer}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130, paddingTop: 4 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
            ListEmptyComponent={
              <Text style={s.empty}>
                Aucune conversation pour l'instant.{'\n\n'}
                Les messages échangés avec vos clients sur votre numéro pro apparaîtront ici.
                Vous pouvez démarrer une conversation depuis la fiche d'un contact (Répertoire).
              </Text>
            }
            renderItem={({ item: t }) => {
              const name = lookupContact(t.peer);
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => nav.navigate('Conversation', { peer: t.peer, name })}
                >
                  <Glass style={s.row}>
                    <View style={s.avatar}>
                      <Text style={{ color: colors.primary, fontWeight: '700' }}>
                        {((name || t.peer)?.replace('+', '')[0] || '?').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.num}>{name || formatFr(t.peer)}</Text>
                      <Text style={s.preview} numberOfLines={1}>
                        {t.last?.direction === 'outbound' ? 'Vous : ' : ''}{t.last?.body}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.time}>{timeLabel(t.updatedAt)}</Text>
                      {t.unread > 0 && (
                        <View style={s.badge}><Text style={s.badgeTxt}>{t.unread}</Text></View>
                      )}
                    </View>
                  </Glass>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <FlatList
            data={vms}
            keyExtractor={(v) => v.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130, paddingTop: 4 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
            ListEmptyComponent={<Text style={s.empty}>Aucun message vocal.</Text>}
            renderItem={({ item: vm }) => {
              const cat = catMeta[vm.aiCategory] || null;
              const urgent = vm.aiUrgency === 'haute';
              return (
                <TouchableOpacity activeOpacity={0.75} onPress={() => openClientCard(vm.call?.fromE164)}>
                <Glass style={s.row}>
                  <View style={s.vmIcon}><Ionicons name="mic" size={17} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text style={s.num}>
                        {vm.call ? (lookupContact(vm.call.fromE164) || formatFr(vm.call.fromE164)) : 'Inconnu'}
                      </Text>
                      {cat && (
                        <View style={[s.catBadge, { backgroundColor: cat.bg }]}>
                          <Text style={[s.catTxt, { color: cat.color }]}>{cat.label}</Text>
                        </View>
                      )}
                      {urgent && (
                        <View style={[s.catBadge, { backgroundColor: '#FDEBEA' }]}>
                          <Text style={[s.catTxt, { color: colors.red }]}>⚡ Urgent</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.sub}>{new Date(vm.createdAt).toLocaleString('fr-FR')}</Text>
                    {vm.aiSummary ? <Text style={s.aiSum}>{vm.aiSummary}</Text> : null}
                    {vm.transcriptionText ? <Text style={s.txt}>« {vm.transcriptionText} »</Text> : null}
                  </View>
                  <View style={{ gap: 8 }}>
                    {vm.call?.fromE164 ? (
                      <TouchableOpacity
                        style={s.callBack}
                        onPress={() => nav.navigate('Appel', {
                          number: toE164Fr(vm.call.fromE164),
                          callerId: proNumber,
                          name: lookupContact(vm.call.fromE164) || undefined,
                        })}
                      >
                        <Ionicons name="call" size={17} color={colors.green} />
                      </TouchableOpacity>
                    ) : null}
                    {vm.audioUrl ? (
                      <TouchableOpacity
                        style={s.play}
                        onPress={() => playVoicemail(vm.audioUrl, {
                          from: vm.call ? (lookupContact(vm.call.fromE164) || formatFr(vm.call.fromE164)) : '',
                          date: new Date(vm.createdAt).toLocaleString('fr-FR'),
                        })}
                      >
                        <Ionicons name="play" size={17} color={colors.primary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </Glass>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </GradientBg>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 12, paddingHorizontal: 20 },
  segments: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12, padding: 3,
  },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  segBtnOn: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  segTxt: { fontSize: 14, fontWeight: '600', color: colors.muted },
  segTxtOn: { color: colors.text, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingVertical: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8EEFF',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  vmIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3EAFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  num: { fontSize: 16, fontWeight: '700', color: colors.text },
  preview: { fontSize: 13.5, color: colors.muted, marginTop: 2 },
  sub: { fontSize: 13, color: colors.muted, marginTop: 1 },
  txt: { fontSize: 14, marginTop: 6, color: colors.text },
  aiSum: { fontSize: 14, marginTop: 6, color: colors.text, fontWeight: '700' },
  catBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2.5, marginLeft: 6 },
  catTxt: { fontSize: 11.5, fontWeight: '800' },
  time: { fontSize: 12, color: colors.muted },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 5, paddingHorizontal: 5,
  },
  badgeTxt: { color: '#fff', fontSize: 11.5, fontWeight: '800' },
  play: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8EEFF', alignItems: 'center', justifyContent: 'center' },
  callBack: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E7F7EE', alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 60, paddingHorizontal: 30, lineHeight: 21 },
});
