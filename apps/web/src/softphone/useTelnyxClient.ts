import { useCallback, useEffect, useRef, useState } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'hangup';

/**
 * Hook qui gère la connexion WebRTC à Telnyx :
 *  - récupère un token court auprès de notre API
 *  - se connecte au SDK Telnyx
 *  - expose les actions : appeler, décrocher, raccrocher
 *  - suit l'état de l'appel courant (entrant ou sortant)
 *
 * C'est le cœur "appeler / répondre" côté client (cf. doc 01 §4 et §5).
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
      const res = await fetch(`${API_URL}/telnyx/webrtc-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userTag: 'demo-user' }),
      });
      if (!res.ok) throw new Error(`Token API: ${res.status}`);
      const { token } = await res.json();

      const client = new TelnyxRTC({ login_token: token });

      client.on('telnyx.ready', () => setRegistered(true));
      client.on('telnyx.error', (e: any) =>
        setError(e?.error?.message || 'Erreur Telnyx'),
      );

      client.on('telnyx.notification', (notification: any) => {
        if (notification.type !== 'callUpdate') return;
        const call = notification.call;
        callRef.current = call;

        switch (call.state) {
          case 'ringing':
            // Appel ENTRANT : on affiche "décrocher"
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

  /** Passer un appel SORTANT. */
  const dial = useCallback((destination: string) => {
    if (!clientRef.current) return;
    setCallState('connecting');
    callRef.current = clientRef.current.newCall({
      destinationNumber: destination,
      audio: true,
      video: false,
    });
  }, []);

  /** Décrocher un appel entrant. */
  const answer = useCallback(() => callRef.current?.answer(), []);

  /** Raccrocher. */
  const hangup = useCallback(() => callRef.current?.hangup(), []);

  useEffect(() => () => disconnect(), [disconnect]);

  return {
    registered,
    callState,
    incomingFrom,
    error,
    connect,
    disconnect,
    dial,
    answer,
    hangup,
  };
}
