import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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

  const { status, error, muted, speaker, seconds, hangup, toggleMute, toggleSpeaker } = useTelnyxCall(destination, callerId);

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
            <Ionicons name="person" size={56} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={s.name}>{name || formatFr(destination) || destination}</Text>
          {!!name && <Text style={s.sub}>{formatFr(destination)}</Text>}
          <Text style={s.status}>{statusText}</Text>
          {!!callerId && status !== 'error' && (
            <Text style={s.via}>Numéro pro : {formatFr(callerId)}</Text>
          )}
        </View>

        <View style={s.controls}>
          <View style={s.ctrl}>
            <TouchableOpacity
              style={[s.ctrlBtn, muted && s.ctrlBtnOn]}
              onPress={toggleMute}
              disabled={status !== 'active'}
              activeOpacity={0.8}
            >
              <Ionicons name={muted ? 'mic-off' : 'mic'} size={28} color={muted ? '#6C5CE7' : '#fff'} />
            </TouchableOpacity>
            <Text style={s.ctrlLabel}>{muted ? 'Réactiver' : 'Muet'}</Text>
          </View>

          <View style={s.ctrl}>
            <TouchableOpacity style={s.hangup} onPress={() => { hangup(); nav.goBack(); }} activeOpacity={0.85}>
              <MaterialIcons name="call-end" size={34} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={s.ctrl}>
            <TouchableOpacity
              style={[s.ctrlBtn, speaker && s.ctrlBtnOn]}
              onPress={toggleSpeaker}
              disabled={status !== 'active'}
              activeOpacity={0.8}
            >
              <Ionicons name={speaker ? 'volume-high' : 'volume-medium'} size={28} color={speaker ? '#6C5CE7' : '#fff'} />
            </TouchableOpacity>
            <Text style={s.ctrlLabel}>{speaker ? 'Haut-parleur' : 'Écouteur'}</Text>
          </View>
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
  controls: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', width: '100%' },
  ctrl: { alignItems: 'center', width: 90 },
  ctrlBtn: {
    width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  ctrlBtnOn: { backgroundColor: '#fff', borderColor: '#fff' },
  ctrlLabel: { color: 'rgba(255,255,255,0.95)', fontSize: 13, marginTop: 8, fontWeight: '600' },
  hangup: {
    width: 74, height: 74, borderRadius: 37, backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF3B30', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
});
