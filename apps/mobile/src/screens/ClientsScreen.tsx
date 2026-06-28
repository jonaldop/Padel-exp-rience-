import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Modal, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { colors } from '../theme';
import { formatFr } from '../format';

export function ClientsScreen({ onCall }: { onCall: (phone: string) => void }) {
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const load = useCallback((q = '') => {
    api.clients(q).then(setList).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { load(search); }, [load]));

  async function add() {
    if (!phone) return;
    try {
      await api.addClient({ name: name || phone, phone });
      setName(''); setPhone(''); setAdding(false);
      load(search);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Clients</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TextInput
          style={s.search}
          placeholder="Rechercher…"
          value={search}
          onChangeText={(t) => { setSearch(t); load(t); }}
        />
        <TouchableOpacity style={s.addBtn} onPress={() => setAdding(true)}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '600' }}>＋</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={<Text style={s.empty}>Aucun client. Ajoutez-en un.</Text>}
        renderItem={({ item: c }) => (
          <View style={s.row}>
            <View style={s.avatar}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {(c.name?.[0] || '?').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{c.name}</Text>
              <Text style={s.sub}>{formatFr(c.phone)}</Text>
            </View>
            <TouchableOpacity style={s.callBtn} onPress={() => onCall(c.phone)}>
              <Text style={{ fontSize: 18 }}>📞</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={adding} animationType="slide" transparent>
        <View style={s.modalWrap}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Nouveau client</Text>
            <TextInput style={s.input} placeholder="Nom" value={name} onChangeText={setName} />
            <TextInput
              style={s.input}
              placeholder="Numéro (06…)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TouchableOpacity style={s.saveBtn} onPress={add}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Enregistrer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAdding(false)}>
              <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 12 }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 30, fontWeight: '800', marginVertical: 12 },
  search: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1,
    borderColor: colors.border, fontSize: 16,
  },
  addBtn: {
    width: 48, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14,
    padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#e6f0ff', alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  name: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 13, color: colors.muted },
  callBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#e7f9ec', alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    padding: 14, fontSize: 16, marginBottom: 12,
  },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 15, alignItems: 'center' },
});
