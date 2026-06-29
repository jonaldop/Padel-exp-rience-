import { useCallback, useState } from 'react';
import { Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass } from '../ui';
import { formatFr, toE164Fr } from '../format';
import { loadContacts, lookupContact } from '../contacts';

const statusMeta: Record<string, { txt: string; color: string }> = {
  completed: { txt: 'Terminé', color: colors.green },
  answered: { txt: 'Répondu', color: colors.green },
  missed: { txt: 'Manqué', color: colors.red },
  voicemail: { txt: 'Messagerie', color: colors.amber },
  forwarded: { txt: 'Renvoyé', color: colors.primary },
  failed: { txt: 'Échec', color: colors.red },
  'ringing-app': { txt: 'Reçu', color: colors.green },
  ringing: { txt: 'Reçu', color: colors.green },
};

export function RecentsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [proNumber, setProNumber] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setLoading(true);
    loadContacts();
    api.myNumbers().then((n: any[]) => setProNumber(n?.[0]?.e164)).catch(() => {});
    api.history().then((c) => setCalls(Array.isArray(c) ? c : [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Rappel direct depuis la liste (appel PRO via Internet, numéro pro présenté).
  const callBack = useCallback((num: string, name?: string) => {
    nav.navigate('Appel', { number: toE164Fr(num), callerId: proNumber, name });
  }, [nav, proNumber]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <GradientBg>
      <FlatList
        data={calls}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 130 }}
        ListHeaderComponent={<Text style={s.title}>Appels</Text>}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={s.empty}>Aucun appel pour le moment.</Text>}
        renderItem={({ item: c }) => {
          const inbound = c.direction === 'inbound';
          const st = statusMeta[c.status] || { txt: c.status, color: colors.muted };
          const isMissed = ['missed', 'failed'].includes(c.status);
          const num = inbound ? c.fromE164 : c.toE164;
          const contactName = lookupContact(num);
          return (
            <Glass style={s.row}>
              <View style={[s.icon, { backgroundColor: isMissed ? '#FDEBEA' : '#E8EEFF' }]}>
                <MaterialIcons
                  name={isMissed ? 'call-missed' : inbound ? 'call-received' : 'call-made'}
                  size={17}
                  color={isMissed ? colors.red : inbound ? colors.green : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.num}>{contactName || formatFr(num)}</Text>
                <Text style={s.sub}>
                  {inbound ? 'Entrant' : 'Sortant'} ·{' '}
                  {new Date(c.startedAt).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={{ color: st.color, fontWeight: '700', marginRight: 10 }}>{st.txt}</Text>
              <TouchableOpacity
                style={s.callBack}
                onPress={() => callBack(num, contactName || undefined)}
              >
                <Ionicons name="call" size={17} color={colors.green} />
              </TouchableOpacity>
            </Glass>
          );
        }}
      />
    </GradientBg>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 14, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingVertical: 12 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  num: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  callBack: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E7F7EE', alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 60 },
});
