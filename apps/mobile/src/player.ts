import { Alert, Linking } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { API_URL } from './api';

/**
 * Lecture des messages vocaux SANS quitter l'app quand c'est possible :
 * - binaire récent (expo-av inclus) -> lecture directe dans l'app, avec
 *   progression (position/durée) remontée via onStatus ;
 * - vieux binaire -> page lecteur brandée Joe (repli).
 */
export type PlayStatus = {
  positionMillis: number;
  durationMillis: number;
  isPlaying: boolean;
  didJustFinish: boolean;
};

let sound: any = null;
let currentUrl: string | null = null;

export function hasInlinePlayer(): boolean {
  return requireOptionalNativeModule('ExponentAV') != null;
}

export async function playVoicemail(
  audioUrl: string,
  meta?: { from?: string; date?: string; vmId?: string },
  onStatus?: (s: PlayStatus) => void,
): Promise<'inline' | 'page'> {
  if (hasInlinePlayer()) {
    try {
      const { Audio } = require('expo-av');
      await stopVoicemail();
      try {
        // Mode audio non bloquant : un échec ici ne doit pas empêcher la lecture.
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      } catch { /* on lit quand même */ }
      // Lecture via le RELAIS de notre serveur : lien Telnyx FRAIS quand on a
      // l'id du message (ceux du webhook expirent en 10 min), et requêtes par
      // plage d'AVPlayer correctement servies (sinon NSURLErrorDomain -1102).
      const proxied = meta?.vmId
        ? `${API_URL}/play/audio?vm=${encodeURIComponent(meta.vmId)}`
        : `${API_URL}/play/audio?src=${encodeURIComponent(audioUrl)}`;
      const res = await Audio.Sound.createAsync(
        { uri: proxied },
        { shouldPlay: true, progressUpdateIntervalMillis: 250 },
        (st: any) => {
          if (!st?.isLoaded) return;
          onStatus?.({
            positionMillis: st.positionMillis || 0,
            durationMillis: st.durationMillis || 0,
            isPlaying: !!st.isPlaying,
            didJustFinish: !!st.didJustFinish,
          });
          if (st.didJustFinish) stopVoicemail();
        },
      );
      sound = res.sound;
      currentUrl = audioUrl;
      return 'inline';
    } catch (e: any) {
      // DIAGNOSTIC (temporaire) : montre pourquoi la lecture interne échoue
      // avant de basculer sur la page lecteur.
      Alert.alert('Lecture interne impossible', String(e?.message || e).slice(0, 300));
    }
  }
  const q = meta?.vmId
    ? new URLSearchParams({ vm: meta.vmId, from: meta?.from || '', date: meta?.date || '' })
    : new URLSearchParams({ src: audioUrl, from: meta?.from || '', date: meta?.date || '' });
  await Linking.openURL(`${API_URL}/play?${q.toString()}`);
  return 'page';
}

/** Pause/reprise du message en cours. Renvoie true si en lecture après l'appel. */
export async function togglePause(): Promise<boolean> {
  if (!sound) return false;
  try {
    const st = await sound.getStatusAsync();
    if (!st.isLoaded) return false;
    if (st.isPlaying) { await sound.pauseAsync(); return false; }
    await sound.playAsync();
    return true;
  } catch {
    return false;
  }
}

export function isCurrent(url: string): boolean {
  return currentUrl === url && sound != null;
}

export async function stopVoicemail() {
  if (sound) {
    try { await sound.stopAsync(); } catch {}
    try { await sound.unloadAsync(); } catch {}
    sound = null;
    currentUrl = null;
  }
}
