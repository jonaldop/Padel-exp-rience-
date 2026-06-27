import { useState } from 'react';
import { useTelnyxClient } from './useTelnyxClient';

const box: React.CSSProperties = {
  maxWidth: 420,
  margin: '40px auto',
  fontFamily: 'system-ui, sans-serif',
  border: '1px solid #e2e2e2',
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
};

const btn: React.CSSProperties = {
  border: 'none',
  borderRadius: 10,
  padding: '12px 18px',
  fontSize: 16,
  cursor: 'pointer',
  color: 'white',
};

export function Softphone() {
  const {
    registered,
    callState,
    incomingFrom,
    error,
    connect,
    dial,
    answer,
    hangup,
  } = useTelnyxClient();
  const [number, setNumber] = useState('+33');

  return (
    <div style={box}>
      <h2 style={{ marginTop: 0 }}>📞 Standard Pro — Softphone</h2>

      <p style={{ color: registered ? '#16a34a' : '#888' }}>
        {registered ? '● Connecté (prêt à appeler/recevoir)' : '○ Non connecté'}
      </p>

      {error && (
        <p style={{ color: '#dc2626', fontSize: 14 }}>⚠️ {error}</p>
      )}

      {!registered && (
        <button style={{ ...btn, background: '#2563eb', width: '100%' }} onClick={connect}>
          Se connecter
        </button>
      )}

      {registered && callState === 'idle' && (
        <>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="+33 6 12 34 56 78"
            style={{
              width: '100%',
              padding: 12,
              fontSize: 18,
              borderRadius: 10,
              border: '1px solid #ccc',
              marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />
          <button
            style={{ ...btn, background: '#16a34a', width: '100%' }}
            onClick={() => dial(number)}
          >
            Appeler
          </button>
        </>
      )}

      {callState === 'ringing' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18 }}>
            📲 Appel entrant<br />
            <strong>{incomingFrom}</strong>
          </p>
          <button style={{ ...btn, background: '#16a34a', marginRight: 8 }} onClick={answer}>
            Décrocher
          </button>
          <button style={{ ...btn, background: '#dc2626' }} onClick={hangup}>
            Rejeter
          </button>
        </div>
      )}

      {(callState === 'active' || callState === 'connecting') && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18 }}>
            {callState === 'active' ? '🟢 En communication' : '… Connexion'}
          </p>
          <button style={{ ...btn, background: '#dc2626' }} onClick={hangup}>
            Raccrocher
          </button>
        </div>
      )}
    </div>
  );
}
