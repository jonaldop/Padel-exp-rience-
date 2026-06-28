import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { gradients } from '../theme';
import { useTelnyxCall } from '../call/useTelnyxCall';
import { formatFr } from '../format';

function mmss(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function CallScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const destination: string = route.params?.number || '';
  const callerId: string | undefined = route.params?.callerId;
  const name: string | undefined = route.params?.name;

  const { status, error, muted, seconds, hangup, toggleMute } = useTelnyxCall(destination, callerId);

  // Quand l'appel se termine, on referme l'écran.
  useEffect(() => {
    if (status === 'ended') {
      const id = setTimeout(() => nav.goBack(), 900);
      return () => clearTimeout(id);
    }
  }, [status, nav]);

  const statusText =
    status === 'connecting' ? 'Connexion…'
    : status === 'ringing' ? 'Sonnerie…'
    : status === 'active' ? mmss(seconds)
    : status === 'ended' ? 'Appel terminé'
    : error || 'Échec de l’appel';

  return (
    <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <View style={[s.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
        <View style={{ alignItems: 'center' }}>
          <View style={s.avatar}>
            <Text style={{ fontSize: 40 }}>👤</Text>
          </View>
          <Text style={s.name}>{name || formatFr(destination) || destination}</Text>
          {!!name && <Text style={s.sub}>{formatFr(destination)}</Text>}
          <Text style={s.status}>{statusText}</Text>
          {!!callerId && status !== 'error' && (
            <Text style={s.via}>Numéro pro : {formatFr(callerId)}</Text>
          )}
        </View>

        <View style={s.controls}>
          <TouchableOpacity style={[s.ctrl, muted && s.ctrlOn]} onPress={toggleMute} disabled={status !== 'active'}>
            <Text style={s.ctrlIcon}>{muted ? '🔇' : '🎙️'}</Text>
            <Text style={s.ctrlLabel}>{muted ? 'Réactiver' : 'Muet'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.hangup} onPress={() => { hangup(); nav.goBack(); }}>
            <Text style={{ fontSize: 30 }}>📞</Text>
          </TouchableOpacity>

          <View style={s.ctrl} />
        </View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 },
  avatar: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  name: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center' },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  status: { fontSize: 17, color: 'rgba(255,255,255,0.95)', marginTop: 16, fontWeight: '600' },
  via: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  ctrl: { width: 80, alignItems: 'center' },
  ctrlOn: { opacity: 1 },
  ctrlIcon: { fontSize: 26 },
  ctrlLabel: { color: '#fff', fontSize: 12.5, marginTop: 6, fontWeight: '600' },
  hangup: {
    width: 74, height: 74, borderRadius: 37, backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '135deg' }],
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
});
