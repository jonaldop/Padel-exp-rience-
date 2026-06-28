import { useCallback, useEffect, useRef, useState } from 'react';
import { TelnyxRTC, Call, CallState } from '@telnyx/react-native-voice-sdk';
import { api } from '../api';

export type UiStatus = 'connecting' | 'ringing' | 'active' | 'ended' | 'error';

/**
 * Appel SORTANT en VoIP (WebRTC) via Telnyx, depuis l'app.
 * - Récupère un token court via notre API (authentifié).
 * - Se connecte au SDK, passe l'appel en présentant le NUMÉRO PRO (callerIdNumber).
 * - L'audio passe par Internet -> coût minimal (1 seule jambe d'appel).
 */
export function useTelnyxCall(destination: string, callerIdNumber?: string) {
  const clientRef = useRef<TelnyxRTC | null>(null);
  const callRef = useRef<Call | null>(null);
  const [status, setStatus] = useState<UiStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Chrono une fois l'appel actif
  useEffect(() => {
    if (status !== 'active') return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  const cleanup = useCallback(() => {
    try { callRef.current?.hangup(); } catch { /* noop */ }
    try { clientRef.current?.disconnect(); } catch { /* noop */ }
    callRef.current = null;
    clientRef.current = null;
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      setStatus('connecting');
      const { token } = await api.webrtcToken();
      const client = new TelnyxRTC({ login_token: token });
      clientRef.current = client;

      (client as any).on('telnyx.client.error', (e: any) => {
        setError(e?.message || 'Erreur de connexion');
        setStatus('error');
      });

      (client as any).on('telnyx.client.ready', async () => {
        try {
          const call = await client.newCall({
            destinationNumber: destination,
            callerIdNumber,
            audio: true,
          });
          callRef.current = call;
          (call as any).on('telnyx.call.state', (_c: Call, state: CallState) => {
            if (state === 'new' || state === 'connecting' || state === 'ringing') setStatus('ringing');
            else if (state === 'active' || state === 'held') setStatus('active');
            else if (state === 'ended' || state === 'dropped') setStatus('ended');
          });
        } catch (e: any) {
          setError(e?.message || "Échec de l'appel");
          setStatus('error');
        }
      });

      await client.connect();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
      setStatus('error');
    }
  }, [destination, callerIdNumber]);

  const hangup = useCallback(() => {
    cleanup();
    setStatus('ended');
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    if (muted) { c.unmute(); setMuted(false); } else { c.mute(); setMuted(true); }
  }, [muted]);

  const sendDtmf = useCallback((d: string) => {
    try { callRef.current?.dtmf(d); } catch { /* noop */ }
  }, []);

  useEffect(() => {
    start();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, error, muted, seconds, hangup, toggleMute, sendDtmf };
}
