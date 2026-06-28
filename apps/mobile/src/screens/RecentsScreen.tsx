import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { colors } from '../theme';
import { formatFr } from '../format';

const statusMeta: Record<string, { txt: string; color: string }> = {
  completed: { txt: 'Terminé', color: colors.green },
  answered: { txt: 'Répondu', color: colors.green },
  missed: { txt: 'Manqué', color: colors.red },
  voicemail: { txt: 'Messagerie', color: colors.amber },
  forwarded: { txt: 'Renvoyé', color: colors.primary },
  failed: { txt: 'Échec', color: colors.red },
};

export function RecentsScreen() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.history().then(setCalls).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={s.container}>
      <Text style={s.title}>Récents</Text>
      <FlatList
        data={calls}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={<Text style={s.empty}>Aucun appel pour le moment.</Text>}
        renderItem={({ item: c }) => {
          const inbound = c.direction === 'inbound';
          const st = statusMeta[c.status] || { txt: c.status, color: colors.muted };
          return (
            <View style={s.row}>
              <Text style={{ fontSize: 20, marginRight: 12 }}>{inbound ? '↙️' : '↗️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.num}>{formatFr(inbound ? c.fromE164 : c.toE164)}</Text>
                <Text style={s.sub}>
                  {inbound ? 'Entrant' : 'Sortant'} ·{' '}
                  {new Date(c.startedAt).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={{ color: st.color, fontWeight: '600' }}>{st.txt}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 30, fontWeight: '800', marginVertical: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  num: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
});
