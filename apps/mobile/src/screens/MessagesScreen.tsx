import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { colors } from '../theme';
import { formatFr } from '../format';

export function MessagesScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.voicemails().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={s.container}>
      <Text style={s.title}>Messagerie</Text>
      <FlatList
        data={items}
        keyExtractor={(v) => v.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={<Text style={s.empty}>Aucun message vocal.</Text>}
        renderItem={({ item: vm }) => (
          <View style={s.row}>
            <Text style={{ fontSize: 20, marginRight: 12 }}>🎙️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.num}>{vm.call ? formatFr(vm.call.fromE164) : 'Inconnu'}</Text>
              <Text style={s.sub}>{new Date(vm.createdAt).toLocaleString('fr-FR')}</Text>
              {vm.transcriptionText ? <Text style={s.txt}>« {vm.transcriptionText} »</Text> : null}
            </View>
            {vm.audioUrl ? (
              <Text style={s.play} onPress={() => Linking.openURL(vm.audioUrl)}>▶︎</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 30, fontWeight: '800', marginVertical: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  num: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 13, color: colors.muted },
  txt: { fontSize: 14, marginTop: 6, color: colors.text },
  play: { fontSize: 22, color: colors.primary, paddingHorizontal: 10 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
});
