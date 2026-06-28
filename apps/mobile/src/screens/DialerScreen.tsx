import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api';
import { colors, gradients } from '../theme';
import { GradientBg } from '../ui';
import { toE164Fr, formatFr } from '../format';

/** Affichage lisible du numéro en cours de composition (groupes de 2). */
function formatDial(raw: string): string {
  if (!raw) return '';
  let prefix = '';
  let rest = raw;
  if (raw.startsWith('+')) {
    prefix = raw.slice(0, 3); // ex. +33
    rest = raw.slice(3);
  }
  const grouped = rest.replace(/(.{2})/g, '$1 ').trim();
  return (prefix ? prefix + ' ' : '') + grouped;
}

const KEYS = [
  { d: '1', s: '' }, { d: '2', s: 'ABC' }, { d: '3', s: 'DEF' },
  { d: '4', s: 'GHI' }, { d: '5', s: 'JKL' }, { d: '6', s: 'MNO' },
  { d: '7', s: 'PQRS' }, { d: '8', s: 'TUV' }, { d: '9', s: 'WXYZ' },
  { d: '*', s: '' }, { d: '0', s: '+' }, { d: '#', s: '' },
];

export function DialerScreen({ initialNumber }: { initialNumber?: string }) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const [number, setNumber] = useState('');
  const [proNumber, setProNumber] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialNumber) setNumber(initialNumber);
  }, [initialNumber]);

  // Récupère le numéro pro du compte (caller ID présenté au correspondant).
  useEffect(() => {
    api.myNumbers().then((n: any[]) => setProNumber(n?.[0]?.e164)).catch(() => {});
  }, []);

  function call() {
    if (!number) return;
    if (!proNumber) {
      Alert.alert('Aucun numéro pro', "Configurez d'abord un numéro pro dans votre espace.");
      return;
    }
    // Appel PRO en VoIP (WebRTC) : audio dans l'app, numéro pro en présentation.
    nav.navigate('Appel', { number: toE164Fr(number), callerId: proNumber });
  }

  return (
    <GradientBg>
      <View style={[s.container, { paddingTop: insets.top + 20, paddingBottom: 130 }]}>
        <View style={s.display}>
          <Text style={s.number} numberOfLines={1} adjustsFontSizeToFit>
            {number ? formatDial(number) : 'Composer'}
          </Text>
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
          {proNumber
            ? `Appel PRO via Internet — votre correspondant voit le ${formatFr(proNumber)}.`
            : 'Appel PRO via Internet (numéro pro en présentation).'}
        </Text>
      </View>
    </GradientBg>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  display: { height: 70, width: '100%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  number: { fontSize: 36, fontWeight: '600', letterSpacing: 1, color: colors.text, textAlign: 'center' },
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
