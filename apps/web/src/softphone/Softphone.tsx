import { useState } from 'react';
import { useTelnyxClient } from './useTelnyxClient';
import { Button, Card, Input, colors } from '../ui';

export function Softphone() {
  const { registered, callState, incomingFrom, error, connect, dial, answer, hangup } =
    useTelnyxClient();
  const [number, setNumber] = useState('+33');

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Softphone</h2>
      <Card style={{ maxWidth: 420 }}>
        <p style={{ color: registered ? colors.green : colors.muted, marginTop: 0 }}>
          {registered ? '● Connecté — prêt à appeler/recevoir' : '○ Non connecté'}
        </p>

        {error && <p style={{ color: colors.red, fontSize: 14 }}>⚠️ {error}</p>}
        {error && (
          <p style={{ color: colors.muted, fontSize: 13 }}>
            (Nécessite un compte Telnyx configuré côté serveur — voir docs/DEV.md)
          </p>
        )}

        {!registered && (
          <Button onClick={connect} style={{ width: '100%' }}>
            Se connecter au softphone
          </Button>
        )}

        {registered && callState === 'idle' && (
          <>
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              style={{ marginBottom: 12, fontSize: 18 }}
            />
            <Button variant="green" onClick={() => dial(number)} style={{ width: '100%' }}>
              Appeler
            </Button>
          </>
        )}

        {callState === 'ringing' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18 }}>
              📲 Appel entrant
              <br />
              <strong>{incomingFrom}</strong>
            </p>
            <Button variant="green" onClick={answer} style={{ marginRight: 8 }}>
              Décrocher
            </Button>
            <Button variant="red" onClick={hangup}>
              Rejeter
            </Button>
          </div>
        )}

        {(callState === 'active' || callState === 'connecting') && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18 }}>{callState === 'active' ? '🟢 En communication' : '… Connexion'}</p>
            <Button variant="red" onClick={hangup}>
              Raccrocher
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
