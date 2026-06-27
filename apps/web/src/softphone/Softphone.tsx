import { useEffect } from 'react';
import { useState } from 'react';
import { useTelnyxClient } from './useTelnyxClient';
import { colors } from '../ui';

const KEYS: { d: string; sub: string }[] = [
  { d: '1', sub: '' },
  { d: '2', sub: 'ABC' },
  { d: '3', sub: 'DEF' },
  { d: '4', sub: 'GHI' },
  { d: '5', sub: 'JKL' },
  { d: '6', sub: 'MNO' },
  { d: '7', sub: 'PQRS' },
  { d: '8', sub: 'TUV' },
  { d: '9', sub: 'WXYZ' },
  { d: '*', sub: '' },
  { d: '0', sub: '+' },
  { d: '#', sub: '' },
];

export function Softphone() {
  const { registered, callState, incomingFrom, error, connect, dial, answer, hangup } =
    useTelnyxClient();
  const [number, setNumber] = useState('');

  // Connexion auto au softphone à l'ouverture du clavier (comme une vraie app)
  useEffect(() => {
    connect();
  }, [connect]);

  const press = (d: string) => setNumber((n) => (n + d).slice(0, 20));
  const back = () => setNumber((n) => n.slice(0, -1));

  // ---- Appel entrant ----
  if (callState === 'ringing') {
    return (
      <CallScreen
        title="Appel entrant"
        subtitle={incomingFrom || 'Inconnu'}
        actions={
          <>
            <RoundBtn color={colors.red} icon="✕" label="Refuser" onClick={hangup} />
            <RoundBtn color={colors.green} icon="📞" label="Accepter" onClick={answer} />
          </>
        }
      />
    );
  }

  // ---- En communication / connexion ----
  if (callState === 'active' || callState === 'connecting') {
    return (
      <CallScreen
        title={callState === 'active' ? 'Appel en cours' : 'Connexion…'}
        subtitle={number || '—'}
        actions={<RoundBtn color={colors.red} icon="✕" label="Raccrocher" onClick={hangup} />}
      />
    );
  }

  // ---- Clavier ----
  return (
    <div style={{ maxWidth: 360, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 34, fontWeight: 500, letterSpacing: '0.04em', color: colors.text }}>
          {number || <span style={{ color: colors.muted }}>Composer</span>}
        </span>
      </div>

      <div style={{ height: 18, fontSize: 12, color: registered ? colors.green : colors.muted }}>
        {error ? '' : registered ? '● Prêt' : '○ Connexion au réseau…'}
      </div>
      {error && (
        <div style={{ fontSize: 12, color: colors.red, marginBottom: 6, padding: '0 16px', wordBreak: 'break-word' }}>
          {error}
        </div>
      )}

      {/* Pavé numérique */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 18,
          justifyItems: 'center',
          margin: '8px auto 18px',
          maxWidth: 300,
        }}
      >
        {KEYS.map((k) => (
          <button
            key={k.d}
            onClick={() => press(k.d)}
            style={{
              width: 74,
              height: 74,
              borderRadius: '50%',
              border: 'none',
              background: colors.soft,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            <span style={{ fontSize: 30, fontWeight: 500, color: colors.text }}>{k.d}</span>
            {k.sub && (
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: colors.muted, marginTop: 2 }}>
                {k.sub}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bouton d'appel + retour arrière */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', maxWidth: 300, margin: '0 auto' }}>
        <span />
        <button
          onClick={() => (registered && number ? dial(number) : connect())}
          disabled={registered && !number}
          style={{
            width: 74,
            height: 74,
            borderRadius: '50%',
            border: 'none',
            background: colors.green,
            color: '#fff',
            fontSize: 32,
            cursor: number || !registered ? 'pointer' : 'default',
            opacity: registered && !number ? 0.4 : 1,
            boxShadow: '0 6px 16px rgba(52,199,89,0.4)',
          }}
        >
          📞
        </button>
        <div style={{ textAlign: 'left', paddingLeft: 18 }}>
          {number && (
            <button onClick={back} style={{ background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: colors.muted }}>
              ⌫
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CallScreen({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions: React.ReactNode;
}) {
  return (
    <div
      style={{
        maxWidth: 360,
        margin: '0 auto',
        textAlign: 'center',
        padding: '40px 0',
        minHeight: 420,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ fontSize: 15, color: colors.muted }}>{title}</div>
        <div style={{ fontSize: 30, fontWeight: 600, marginTop: 8 }}>{subtitle}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'flex-end' }}>{actions}</div>
    </div>
  );
}

function RoundBtn({
  color,
  icon,
  label,
  onClick,
}: {
  color: string;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button
        onClick={onClick}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: 'none',
          background: color,
          color: '#fff',
          fontSize: 30,
          cursor: 'pointer',
          boxShadow: `0 6px 16px ${color}66`,
        }}
      >
        {icon}
      </button>
      <span style={{ fontSize: 13, color: colors.muted }}>{label}</span>
    </div>
  );
}
