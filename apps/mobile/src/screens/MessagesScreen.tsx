import { useCallback, useState } from 'react';
import { Text, FlatList, StyleSheet, RefreshControl, Linking, View, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass } from '../ui';
import { formatFr } from '../format';

export function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.voicemails().then((v) => setItems(Array.isArray(v) ? v : [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <GradientBg>
      <FlatList
        data={items}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 130 }}
        ListHeaderComponent={<Text style={s.title}>Messagerie</Text>}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={s.empty}>Aucun message vocal.</Text>}
        renderItem={({ item: vm }) => (
          <Glass style={s.row}>
            <View style={s.icon}><Text style={{ fontSize: 16 }}>🎙️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.num}>{vm.call ? formatFr(vm.call.fromE164) : 'Inconnu'}</Text>
              <Text style={s.sub}>{new Date(vm.createdAt).toLocaleString('fr-FR')}</Text>
              {vm.transcriptionText ? <Text style={s.txt}>« {vm.transcriptionText} »</Text> : null}
            </View>
            {vm.audioUrl ? (
              <TouchableOpacity style={s.play} onPress={() => Linking.openURL(vm.audioUrl)}>
                <Text style={{ fontSize: 16, color: colors.primary }}>▶︎</Text>
              </TouchableOpacity>
            ) : null}
          </Glass>
        )}
      />
    </GradientBg>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 14, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingVertical: 12 },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3EAFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  num: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 1 },
  txt: { fontSize: 14, marginTop: 6, color: colors.text },
  play: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8EEFF', alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 60 },
});
