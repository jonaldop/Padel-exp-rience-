import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { gradients } from '../theme';
import { formatFr } from '../format';
import { answerIncoming, declineIncoming, setIncomingListener, IncomingState } from '../call/incomingCalls';

function mmss(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function IncomingCallScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const [state, setState] = useState<IncomingState>('ringing');
  const [from, setFrom] = useState<string>(route.params?.from || '');
  const name: string | undefined = route.params?.name;
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setIncomingListener((s, f) => {
      setState(s);
      if (f) setFrom(f);
      if (s === 'ended') setTimeout(() => nav.canGoBack() && nav.goBack(), 600);
    });
    return () => setIncomingListener(null);
  }, [nav]);

  useEffect(() => {
    if (state !== 'active') return;
    const id = setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  const statusText =
    state === 'ringing' ? 'Appel entrant…'
    : state === 'connecting' ? 'Connexion…'
    : state === 'active' ? mmss(seconds)
    : 'Appel terminé';

  return (
    <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <View style={[s.container, { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 50 }]}>
        <View style={{ alignItems: 'center' }}>
          <View style={s.avatar}><Text style={{ fontSize: 44 }}>👤</Text></View>
          <Text style={s.name}>{name || formatFr(from) || from || 'Inconnu'}</Text>
          {!!name && <Text style={s.sub}>{formatFr(from)}</Text>}
          <Text style={s.status}>{statusText}</Text>
          {!name && <Text style={s.sub}>Ligne pro</Text>}
        </View>

        {state === 'ringing' ? (
          <View style={s.row}>
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity style={[s.btn, s.decline]} onPress={() => declineIncoming()}>
                <Text style={{ fontSize: 30 }}>📞</Text>
              </TouchableOpacity>
              <Text style={s.btnLabel}>Refuser</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity style={[s.btn, s.answer]} onPress={() => answerIncoming()}>
                <Text style={{ fontSize: 30 }}>📞</Text>
              </TouchableOpacity>
              <Text style={s.btnLabel}>Répondre</Text>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity style={[s.btn, s.decline]} onPress={() => declineIncoming()}>
              <Text style={{ fontSize: 30 }}>📞</Text>
            </TouchableOpacity>
            <Text style={s.btnLabel}>Raccrocher</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 },
  avatar: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  name: { fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center' },
  status: { fontSize: 17, color: 'rgba(255,255,255,0.95)', marginTop: 14, fontWeight: '600' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  btn: {
    width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  answer: { backgroundColor: '#34C759' },
  decline: { backgroundColor: '#FF3B30', transform: [{ rotate: '135deg' }] },
  btnLabel: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 10 },
});
