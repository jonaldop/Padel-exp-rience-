import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass } from '../ui';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phonePerso, setPhonePerso] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.me().then((me: any) => {
      setFirstName(me?.user?.firstName || '');
      setLastName(me?.user?.lastName || '');
      setPhonePerso(me?.user?.phonePerso || '');
      setEmail(me?.user?.email || '');
    }).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.updateProfile({ firstName, lastName, phonePerso });
      Alert.alert('Enregistré', 'Vos informations ont été mises à jour.');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <GradientBg>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 52, paddingHorizontal: 16, paddingBottom: 60 }}>
        <Text style={s.title}>Mes informations</Text>
        <Glass strong>
          <Text style={s.label}>Prénom</Text>
          <TextInput style={s.input} value={firstName} onChangeText={setFirstName} placeholder="Prénom" placeholderTextColor={colors.muted} />
          <Text style={s.label}>Nom</Text>
          <TextInput style={s.input} value={lastName} onChangeText={setLastName} placeholder="Nom" placeholderTextColor={colors.muted} />
          <Text style={s.label}>Téléphone perso</Text>
          <TextInput style={s.input} value={phonePerso} onChangeText={setPhonePerso} placeholder="06 …" placeholderTextColor={colors.muted} keyboardType="phone-pad" />
          <Text style={s.label}>Email (non modifiable)</Text>
          <Text style={s.readonly}>{email || '—'}</Text>
        </Glass>
        <TouchableOpacity style={s.save} onPress={save} disabled={saving}>
          <Text style={s.saveTxt}>{saving ? '…' : 'Enregistrer'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </GradientBg>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 14, paddingHorizontal: 4 },
  label: { fontSize: 13, color: colors.muted, marginTop: 12, marginBottom: 4, fontWeight: '600' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    padding: 13, fontSize: 16, color: colors.text,
  },
  readonly: { fontSize: 16, color: colors.text, paddingVertical: 4 },
  save: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 18 },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
