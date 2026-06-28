import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients } from '../theme';
import { GradientBg } from '../ui';
import { toE164Fr } from '../format';

const KEYS = [
  { d: '1', s: '' }, { d: '2', s: 'ABC' }, { d: '3', s: 'DEF' },
  { d: '4', s: 'GHI' }, { d: '5', s: 'JKL' }, { d: '6', s: 'MNO' },
  { d: '7', s: 'PQRS' }, { d: '8', s: 'TUV' }, { d: '9', s: 'WXYZ' },
  { d: '*', s: '' }, { d: '0', s: '+' }, { d: '#', s: '' },
];

export function DialerScreen({ initialNumber }: { initialNumber?: string }) {
  const insets = useSafeAreaInsets();
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
    <GradientBg>
      <View style={[s.container, { paddingTop: insets.top + 20, paddingBottom: 130 }]}>
        <View style={s.display}>
          <Text style={s.number}>{number || 'Composer'}</Text>
        </View>
        <View style={s.pad}>
          {KEYS.map((k) => (
            <TouchableOpacity key={k.d} style={s.key} activeOpacity={0.6} onPress={() => setNumber((n) => n + k.d)}>
              <Text style={s.keyNum}>{k.d}</Text>
              {!!k.s && <Text style={s.keySub}>{k.s}</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.actions}>
          <View style={{ width: 74 }} />
          <TouchableOpacity activeOpacity={0.85} onPress={call}>
            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.callBtn}>
              <Text style={{ fontSize: 30 }}>📞</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={{ width: 74, alignItems: 'center' }} onPress={() => setNumber((n) => n.slice(0, -1))}>
            {!!number && <Text style={{ fontSize: 26, color: colors.muted }}>⌫</Text>}
          </TouchableOpacity>
        </View>
        <Text style={s.note}>
          Appel via votre ligne. L'appel PRO (numéro pro + audio in-app) arrive dans une prochaine version.
        </Text>
      </View>
    </GradientBg>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  display: { height: 70, justifyContent: 'center' },
  number: { fontSize: 36, fontWeight: '500', letterSpacing: 2, color: colors.text },
  pad: { width: 300, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  key: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center',
    justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  keyNum: { fontSize: 30, fontWeight: '500', color: colors.text },
  keySub: { fontSize: 10, color: colors.muted, fontWeight: '700', letterSpacing: 1 },
  actions: { width: 300, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  callBtn: {
    width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  note: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 20, paddingHorizontal: 20 },
});
