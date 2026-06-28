import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { colors } from '../theme';
import { toE164Fr } from '../format';

const KEYS = [
  { d: '1', s: '' }, { d: '2', s: 'ABC' }, { d: '3', s: 'DEF' },
  { d: '4', s: 'GHI' }, { d: '5', s: 'JKL' }, { d: '6', s: 'MNO' },
  { d: '7', s: 'PQRS' }, { d: '8', s: 'TUV' }, { d: '9', s: 'WXYZ' },
  { d: '*', s: '' }, { d: '0', s: '+' }, { d: '#', s: '' },
];

export function DialerScreen({ initialNumber }: { initialNumber?: string }) {
  const [number, setNumber] = useState('');

  useEffect(() => {
    if (initialNumber) setNumber(initialNumber);
  }, [initialNumber]);

  function call() {
    if (!number) return;
    // MVP natif : appel via la ligne du téléphone (SIM).
    // ➜ Prochaine étape : appel PRO via WebRTC Telnyx + CallKit (build dédié).
    const e164 = toE164Fr(number);
    Linking.openURL(`tel:${e164}`).catch(() =>
      Alert.alert('Erreur', "Impossible de lancer l'appel."),
    );
  }

  return (
    <View style={s.container}>
      <View style={s.display}>
        <Text style={s.number}>{number || 'Composer'}</Text>
      </View>
      <View style={s.pad}>
        {KEYS.map((k) => (
          <TouchableOpacity key={k.d} style={s.key} onPress={() => setNumber((n) => n + k.d)}>
            <Text style={s.keyNum}>{k.d}</Text>
            {!!k.s && <Text style={s.keySub}>{k.s}</Text>}
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.actions}>
        <View style={{ width: 74 }} />
        <TouchableOpacity style={s.callBtn} onPress={call}>
          <Text style={{ fontSize: 30 }}>📞</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ width: 74, alignItems: 'center' }} onPress={() => setNumber((n) => n.slice(0, -1))}>
          {!!number && <Text style={{ fontSize: 26, color: colors.muted }}>⌫</Text>}
        </TouchableOpacity>
      </View>
      <Text style={s.note}>
        Appel via votre ligne. L'appel PRO (numéro pro + audio in-app) arrive dans une prochaine version.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  display: { height: 70, justifyContent: 'center' },
  number: { fontSize: 36, fontWeight: '500', letterSpacing: 2 },
  pad: { width: 300, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  key: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center',
    justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.border,
  },
  keyNum: { fontSize: 30, fontWeight: '500' },
  keySub: { fontSize: 10, color: colors.muted, fontWeight: '700', letterSpacing: 1 },
  actions: { width: 300, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  callBtn: {
    width: 74, height: 74, borderRadius: 37, backgroundColor: colors.green, alignItems: 'center',
    justifyContent: 'center',
  },
  note: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 20, paddingHorizontal: 20 },
});
