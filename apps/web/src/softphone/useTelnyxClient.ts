import { useCallback, useEffect, useRef, useState } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';
import { api } from '../api';

export type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'hangup';

/**
 * Connexion WebRTC à Telnyx pour le softphone : récupère un token via NOTRE API
 * (authentifié), se connecte au SDK, expose appeler / décrocher / raccrocher.
 * (docs/01 §4-5)
 */
export function useTelnyxClient() {
  const clientRef = useRef<TelnyxRTC | null>(null);
  const callRef = useRef<any>(null);
  const [registered, setRegistered] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [incomingFrom, setIncomingFrom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    try {
      setError(null);
      const { token } = await api.webrtcToken();
      const client = new TelnyxRTC({ login_token: token });

      client.on('telnyx.ready', () => setRegistered(true));
      client.on('telnyx.error', (e: any) => setError(e?.error?.message || 'Erreur Telnyx'));
      client.on('telnyx.notification', (n: any) => {
        if (n.type !== 'callUpdate') return;
        const call = n.call;
        callRef.current = call;
        switch (call.state) {
          case 'ringing':
            setIncomingFrom(call.options?.remoteCallerNumber || 'Inconnu');
            setCallState('ringing');
            break;
          case 'active':
            setCallState('active');
            setIncomingFrom(null);
            break;
          case 'hangup':
          case 'destroy':
            setCallState('idle');
            setIncomingFrom(null);
            callRef.current = null;
            break;
          default:
            setCallState('connecting');
        }
      });

      client.connect();
      clientRef.current = client;
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setRegistered(false);
  }, []);

  const dial = useCallback((destination: string) => {
    if (!clientRef.current) return;
    setCallState('connecting');
    callRef.current = clientRef.current.newCall({
      destinationNumber: destination,
      audio: true,
      video: false,
    });
  }, []);

  const answer = useCallback(() => callRef.current?.answer(), []);
  const hangup = useCallback(() => callRef.current?.hangup(), []);

  useEffect(() => () => disconnect(), [disconnect]);

  return { registered, callState, incomingFrom, error, connect, disconnect, dial, answer, hangup };
}
