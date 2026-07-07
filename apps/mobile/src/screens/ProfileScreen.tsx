import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass } from '../ui';

export function ProfileScreen({ onLogout }: { onLogout?: () => void }) {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phonePerso, setPhonePerso] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  // Sécurité : changement de mot de passe
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

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

  /** Suppression définitive du compte (App Store 5.1.1 / RGPD). */
  function confirmDelete() {
    Alert.alert(
      'Supprimer votre compte ?',
      'Cette action est définitive : votre numéro sera libéré, vos messages, enregistrements et données effacés, et votre abonnement annulé.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          style: 'destructive',
          onPress: () =>
            Alert.prompt(
              'Confirmez avec votre mot de passe',
              undefined,
              [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Supprimer définitivement', style: 'destructive', onPress: (pwd) => doDelete(pwd || '') },
              ],
              'secure-text',
            ),
        },
      ],
    );
  }

  async function doDelete(pwd: string) {
    try {
      const r = await api.deleteAccount(pwd);
      if (r?.error) { Alert.alert('Impossible', r.error); return; }
      Alert.alert('Compte supprimé', 'Toutes vos données ont été effacées. Merci d\u2019avoir essayé Joe.');
      onLogout?.();
    } catch (e: any) {
      Alert.alert('Impossible', e.message || 'Réessayez plus tard.');
    }
  }

  async function changePwd() {
    if (newPwd.length < 8) {
      Alert.alert('Mot de passe trop court', '8 caractères minimum.');
      return;
    }
    setPwdSaving(true);
    try {
      await api.changePassword(curPwd, newPwd);
      setCurPwd('');
      setNewPwd('');
      Alert.alert('✅ Mot de passe modifié', 'Utilisez-le à votre prochaine connexion.');
    } catch (e: any) {
      Alert.alert('Impossible', e.message || 'Vérifiez votre mot de passe actuel.');
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <GradientBg>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingHorizontal: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
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

        {/* Sécurité : changer le mot de passe */}
        <Text style={[s.title, { fontSize: 20, marginTop: 28 }]}>Sécurité</Text>
        <Glass strong>
          <Text style={s.label}>Mot de passe actuel</Text>
          <TextInput
            style={s.input}
            value={curPwd}
            onChangeText={setCurPwd}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
          />
          <Text style={s.label}>Nouveau mot de passe</Text>
          <TextInput
            style={s.input}
            value={newPwd}
            onChangeText={setNewPwd}
            secureTextEntry
            placeholder="8 caractères minimum"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
          />
        </Glass>
        <TouchableOpacity
          style={[s.save, (!curPwd || !newPwd) && { opacity: 0.5 }]}
          onPress={changePwd}
          disabled={pwdSaving || !curPwd || !newPwd}
        >
          <Text style={s.saveTxt}>{pwdSaving ? '…' : 'Changer le mot de passe'}</Text>
        </TouchableOpacity>

        {/* Zone dangereuse : suppression du compte (exigence App Store) */}
        <Text style={[s.title, { fontSize: 20, marginTop: 32, color: colors.red }]}>Zone dangereuse</Text>
        <Glass strong>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
            La suppression de votre compte est définitive : numéro libéré, messages et
            enregistrements effacés, abonnement annulé.
          </Text>
          <TouchableOpacity style={{ marginTop: 12 }} onPress={confirmDelete}>
            <Text style={{ color: colors.red, fontWeight: '800', fontSize: 15 }}>
              Supprimer mon compte
            </Text>
          </TouchableOpacity>
        </Glass>
      </ScrollView>
      </KeyboardAvoidingView>
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
