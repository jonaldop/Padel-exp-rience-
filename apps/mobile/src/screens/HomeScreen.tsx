import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../api';
import { colors } from '../theme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { GradientBg, Glass, Delta, Waveform } from '../ui';
import { formatFr, toE164Fr } from '../format';
import { BUILD_TAG } from '../version';
import { setLineStatusListener, LineStatus } from '../call/incomingCalls';
import { loadContacts, lookupContact } from '../contacts';

function isSameDay(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

function computeStats(calls: any[], vms: any[]) {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);

  const inb = (c: any) => c.direction === 'inbound';
  const answered = (c: any) => ['answered', 'completed', 'forwarded'].includes(c.status);
  const missed = (c: any) => ['missed', 'failed', 'no_answer'].includes(c.status);

  const day = (arr: any[], ref: Date, key = 'startedAt') => arr.filter((x) => isSameDay(x[key] || x.createdAt, ref));

  const todayIn = day(calls, today).filter(inb);
  const yestIn = day(calls, yest).filter(inb);

  const pct = (a: number, b: number) => (b === 0 ? null : Math.round(((a - b) / b) * 100));

  const rate = (arr: any[]) => {
    if (arr.length === 0) return 0;
    return Math.round((arr.filter(answered).length / arr.length) * 100);
  };

  return {
    recus: { value: todayIn.length, delta: pct(todayIn.length, yestIn.length) },
    messages: { value: day(vms, today, 'createdAt').length, delta: pct(day(vms, today, 'createdAt').length, day(vms, yest, 'createdAt').length) },
    taux: { value: rate(todayIn), delta: pct(rate(todayIn), rate(yestIn)) },
    manques: { value: todayIn.filter(missed).length, delta: pct(todayIn.filter(missed).length, yestIn.filter(missed).length) },
  };
}

const STATUS_LABEL: Record<string, string> = {
  answered: 'Répondu',
  completed: 'Terminé',
  forwarded: 'Renvoyé',
  missed: 'Appel manqué',
  failed: 'Échec',
  voicemail: 'Message vocal',
  'ringing-app': 'Reçu',
  ringing: 'Reçu',
};

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const [me, setMe] = useState<any>(null);
  const [calls, setCalls] = useState<any[]>([]);
  const [vms, setVms] = useState<any[]>([]);
  const [ai, setAi] = useState(false);
  const [proNumber, setProNumber] = useState<string>('');
  const [lineStatus, setLineStatus] = useState<LineStatus>('offline');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLineStatusListener(setLineStatus);
    return () => setLineStatusListener(null);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    loadContacts();
    Promise.all([
      api.me().then(setMe).catch(() => {}),
      api.history().then((c) => setCalls(Array.isArray(c) ? c : [])).catch(() => {}),
      api.voicemails().then((v) => setVms(Array.isArray(v) ? v : [])).catch(() => {}),
      api.myNumbers().then((n: any[]) => {
        setAi(Boolean(n?.[0])); // réceptionniste active dès qu'un numéro existe
        setProNumber(n?.[0]?.e164 || '');
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = computeStats(calls, vms);
  const name = me?.user?.firstName || me?.account?.companyName || '';
  const recent = calls.slice(0, 3);
  const unread = vms.filter((v) => !v.isRead).length;

  return (
    <GradientBg>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        <Text style={{ textAlign: 'right', color: colors.muted, fontSize: 11, marginBottom: 2 }}>{BUILD_TAG}</Text>

        {/* En-tête */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.hello}>Bonjour 👋</Text>
            <Text style={s.name}>Bienvenue{name ? `, ${name}` : ''}</Text>
            <Text style={s.sub}>Voici l'activité de votre ligne aujourd'hui.</Text>
            {!!proNumber && (
              <View style={s.proChip}>
                <Text style={s.proChipTxt}>📞 Ligne pro · {formatFr(proNumber)}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 6, backgroundColor:
                lineStatus === 'connected' ? colors.green : lineStatus === 'connecting' ? colors.amber : lineStatus === 'unsupported' ? colors.muted : colors.red }} />
              <Text style={{ fontSize: 12.5, color: colors.muted }}>
                {lineStatus === 'connected' ? 'Ligne connectée — prête à recevoir'
                  : lineStatus === 'connecting' ? 'Connexion de la ligne…'
                  : lineStatus === 'unsupported' ? 'Réception in-app indisponible (ce build)'
                  : 'Ligne hors ligne'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={s.bell} onPress={() => nav.navigate('Messages')}>
            <Text style={{ fontSize: 18 }}>🔔</Text>
            {unread > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeTxt}>{unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Activité du jour */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => nav.navigate('Statistiques')}>
          <Glass strong style={{ marginTop: 18 }}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Activité du jour</Text>
              <View style={s.pill}>
                <Text style={s.pillTxt}>Aujourd'hui</Text>
              </View>
            </View>
            <View style={s.tiles}>
              <StatTile icon="📞" tint="#E8EEFF" value={stats.recus.value} label="Appels reçus" delta={stats.recus.delta} />
              <StatTile icon="💬" tint="#EAF0FF" value={stats.messages.value} label="Messages" delta={stats.messages.delta} />
              <StatTile icon="⏱️" tint="#E7F7EE" value={`${stats.taux.value}%`} label="Taux de réponse" delta={stats.taux.delta} />
              <StatTile icon="👤" tint="#F3EAFF" value={stats.manques.value} label="Appels manqués" delta={stats.manques.delta} invert />
            </View>
          </Glass>
        </TouchableOpacity>

        {/* Réceptionniste IA (secrétariat : transcription + qualification) */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => nav.navigate('Receptionniste')}>
          <Glass strong style={{ marginTop: 14 }}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Assistant IA</Text>
              <View style={[s.statusDot, { backgroundColor: ai ? '#E7F7EE' : '#F1F1F4' }]}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ai ? colors.green : colors.muted, marginRight: 6 }} />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: ai ? colors.green : colors.muted }}>
                  {ai ? 'Actif' : 'Inactif'}
                </Text>
              </View>
            </View>
            <View style={{ marginVertical: 10 }}>
              <Waveform color={colors.primary} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                  {ai ? 'Réceptionniste IA en ligne' : 'Ajoutez un numéro pour l’activer'}
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                  {(() => {
                    const weekAgo = Date.now() - 7 * 86400000;
                    const q = vms.filter((v) => v.aiSummary && new Date(v.createdAt).getTime() > weekAgo).length;
                    return q > 0
                      ? `${q} message${q > 1 ? 's' : ''} qualifié${q > 1 ? 's' : ''} cette semaine — toucher pour régler.`
                      : 'Je réponds, je transcris et je qualifie vos appels manqués.';
                  })()}
                </Text>
              </View>
              <Text style={{ fontSize: 22, color: colors.primary, marginLeft: 8 }}>→</Text>
            </View>
          </Glass>
        </TouchableOpacity>

        {/* Derniers appels */}
        <View style={[s.cardHead, { marginTop: 22, marginBottom: 6, paddingHorizontal: 4 }]}>
          <Text style={[s.cardTitle, { fontSize: 18 }]}>Derniers appels</Text>
          <TouchableOpacity onPress={() => nav.navigate('Appels')}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {recent.length === 0 ? (
          <Glass><Text style={{ color: colors.muted, textAlign: 'center' }}>Aucun appel pour le moment.</Text></Glass>
        ) : (
          recent.map((c) => {
            const inbound = c.direction === 'inbound';
            const rawNum = inbound ? c.fromE164 : c.toE164;
            const num = lookupContact(rawNum) || formatFr(rawNum);
            const isMissed = ['missed', 'failed', 'no_answer'].includes(c.status);
            return (
              <Glass key={c.id} style={s.callRow}>
                <View style={[s.callIcon, { backgroundColor: isMissed ? '#FDEBEA' : '#E8EEFF' }]}>
                  <MaterialIcons
                    name={isMissed ? 'call-missed' : inbound ? 'call-received' : 'call-made'}
                    size={16}
                    color={isMissed ? colors.red : inbound ? colors.green : colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.callNum}>{num}</Text>
                  <Text style={s.callSub}>{STATUS_LABEL[c.status] || (inbound ? 'Entrant' : 'Sortant')}</Text>
                </View>
                <Text style={s.callTime}>
                  {isSameDay(c.startedAt, new Date())
                    ? new Date(c.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : new Date(c.startedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                </Text>
                <TouchableOpacity
                  style={[s.callBack, { backgroundColor: isMissed ? '#FDEBEA' : '#E7F7EE' }]}
                  onPress={() => nav.navigate('Appel', { number: toE164Fr(rawNum), callerId: proNumber || undefined, name: lookupContact(rawNum) || undefined })}
                >
                  <Ionicons name="call" size={16} color={colors.green} />
                </TouchableOpacity>
              </Glass>
            );
          })
        )}
      </ScrollView>
    </GradientBg>
  );
}

function StatTile({
  icon,
  tint,
  value,
  label,
  delta,
  invert,
}: {
  icon: string;
  tint: string;
  value: number | string;
  label: string;
  delta: number | null;
  invert?: boolean;
}) {
  // Pour "appels manqués", une hausse est négative -> on inverse la couleur.
  const shownDelta = delta === null ? null : invert ? -delta : delta;
  return (
    <View style={s.tile}>
      <View style={[s.tileIcon, { backgroundColor: tint }]}>
        <Text style={{ fontSize: 17 }}>{icon}</Text>
      </View>
      <Text style={s.tileValue}>{value}</Text>
      <Text style={s.tileLabel}>{label}</Text>
      <Delta value={shownDelta} />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4 },
  hello: { fontSize: 15, color: colors.muted },
  name: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 2 },
  sub: { fontSize: 14, color: colors.muted, marginTop: 4 },
  proChip: {
    alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  proChipTxt: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
  bell: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  bellBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  bellBadgeTxt: { color: '#fff', fontSize: 10.5, fontWeight: '800' },

  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  pill: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  pillTxt: { fontSize: 13, fontWeight: '600', color: colors.text },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14 },
  tile: {
    width: '48%', backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 18, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
  },
  tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileValue: { fontSize: 26, fontWeight: '800', color: colors.text },
  tileLabel: { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: 4 },

  statusDot: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },

  callRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingVertical: 12 },
  callIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  callNum: { fontSize: 15.5, fontWeight: '700', color: colors.text },
  callSub: { fontSize: 13, color: colors.muted, marginTop: 1 },
  callTime: { fontSize: 13, color: colors.muted, marginHorizontal: 10 },
  callBack: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
