import { Linking } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { API_URL } from './api';

/**
 * Lecture des messages vocaux SANS quitter l'app quand c'est possible :
 * - binaire récent (expo-av inclus) -> lecture directe dans l'app ;
 * - binaire actuel -> page lecteur brandée Joe (au lieu du lien AWS brut).
 */
let sound: any = null;

export async function playVoicemail(audioUrl: string, meta?: { from?: string; date?: string }) {
  const hasAv = requireOptionalNativeModule('ExponentAV') != null;
  if (hasAv) {
    try {
      const { Audio } = require('expo-av');
      if (sound) { try { await sound.unloadAsync(); } catch {} sound = null; }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const res = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: true });
      sound = res.sound;
      return 'inline' as const;
    } catch {
      /* on retombe sur la page lecteur */
    }
  }
  const q = new URLSearchParams({ src: audioUrl, from: meta?.from || '', date: meta?.date || '' });
  await Linking.openURL(`${API_URL}/play?${q.toString()}`);
  return 'page' as const;
}

export async function stopVoicemail() {
  if (sound) { try { await sound.stopAsync(); await sound.unloadAsync(); } catch {} sound = null; }
}
