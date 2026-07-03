import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Linking } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { GradientBg, Glass } from '../ui';
import { formatFr } from '../format';
import { listContactsFull, ContactDetail } from '../contacts';

export function ClientsScreen({ onCall }: { onCall: (phone: string) => void }) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const [list, setList] = useState<ContactDetail[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  const load = useCallback((q = '') => {
    setLoading(true);
    listContactsFull(q)
      .then((c) => {
        setList(c);
        setDenied(c.length === 0 && !q);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(search); }, [load]));

  return (
    <GradientBg>
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <Text style={s.title}>Répertoire</Text>
        <TextInput
          style={s.search}
          placeholder="Rechercher un contact…"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={(t) => { setSearch(t); load(t); }}
        />

        {denied ? (
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>
              Autorisez l'accès aux contacts pour retrouver votre répertoire ici.
            </Text>
            <TouchableOpacity style={s.permBtn} onPress={() => Linking.openSettings()}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Ouvrir les réglages</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(c, i) => c.id + i}
            contentContainerStyle={{ paddingBottom: 130, paddingTop: 12 }}
            ListEmptyComponent={
              <Text style={s.empty}>{loading ? 'Chargement…' : 'Aucun contact trouvé.'}</Text>
            }
            renderItem={({ item: c }) => (
              <TouchableOpacity activeOpacity={0.7} onPress={() => nav.navigate('FicheContact', { contact: c })}>
                <Glass style={s.row}>
                  <View style={s.avatar}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      {(c.name?.[0] || '?').toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{c.name}</Text>
                    <Text style={s.sub}>{formatFr(c.phones[0])}{c.phones.length > 1 ? ` +${c.phones.length - 1}` : ''}</Text>
                  </View>
                  <TouchableOpacity style={s.callBtn} onPress={() => onCall(c.phones[0])}>
                    <Ionicons name="call" size={18} color={colors.green} />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color={colors.muted} style={{ marginLeft: 6 }} />
                </Glass>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </GradientBg>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 12, paddingHorizontal: 4 },
  search: {
    backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 14, padding: 13, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)', fontSize: 16, color: colors.text,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingVertical: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8EEFF', alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.muted },
  callBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#E7F7EE', alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  permBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
});
