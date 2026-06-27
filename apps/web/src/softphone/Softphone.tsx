import { useState } from 'react';
import { useTelnyxClient } from './useTelnyxClient';
import { Button, Card, Input, PageTitle, colors } from '../ui';

export function Softphone() {
  const { registered, callState, incomingFrom, error, connect, dial, answer, hangup } = useTelnyxClient();
  const [number, setNumber] = useState('+33');

  return (
    <div>
      <PageTitle subtitle="Passez et recevez vos appels pro">Appeler</PageTitle>

      <Card style={{ maxWidth: 440, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: registered ? colors.green : '#cbd5e1',
              boxShadow: registered ? `0 0 0 4px ${colors.greenSoft}` : 'none',
            }}
          />
          <span style={{ color: registered ? colors.green : colors.muted, fontSize: 14, fontWeight: 600 }}>
            {registered ? 'Connecté — prêt à appeler' : 'Non connecté'}
          </span>
        </div>

        {error && (
          <div style={{ background: colors.amberSoft, color: '#b45309', padding: '10px 12px', borderRadius: 12, fontSize: 13, marginBottom: 14 }}>
            ℹ️ Le softphone nécessite un compte Telnyx configuré côté serveur pour le son réel.
          </div>
        )}

        {!registered && (
          <Button onClick={connect} full style={{ padding: 14, fontSize: 16 }}>
            Se connecter au softphone
          </Button>
        )}

        {registered && callState === 'idle' && (
          <>
            <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+33 6 12 34 56 78" style={{ fontSize: 20, textAlign: 'center', marginBottom: 14, letterSpacing: '0.04em' }} />
            <Button variant="green" onClick={() => dial(number)} full style={{ padding: 16, fontSize: 17 }}>
              📞 Appeler
            </Button>
          </>
        )}

        {callState === 'ringing' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 14, color: colors.muted }}>Appel entrant</div>
            <div style={{ fontSize: 22, fontWeight: 800, margin: '6px 0 18px' }}>{incomingFrom}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Button variant="green" onClick={answer} style={{ padding: '14px 24px' }}>
                Décrocher
              </Button>
              <Button variant="red" onClick={hangup} style={{ padding: '14px 24px' }}>
                Rejeter
              </Button>
            </div>
          </div>
        )}

        {(callState === 'active' || callState === 'connecting') && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>
              {callState === 'active' ? '🟢 En communication' : '… Connexion'}
            </div>
            <Button variant="red" onClick={hangup} style={{ padding: '14px 28px' }}>
              Raccrocher
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
