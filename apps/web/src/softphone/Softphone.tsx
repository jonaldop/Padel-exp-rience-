import { useEffect, useState } from 'react';
import { useTelnyxClient } from './useTelnyxClient';
import { api } from '../api';
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

// --- Styles "Liquid Glass" ---
const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.35)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: '0 6px 18px rgba(0,0,0,0.10), inset 0 1px 1px rgba(255,255,255,0.8)',
};

function Blob({ color, style }: { color: string; style: React.CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: '50%',
        background: color,
        filter: 'blur(60px)',
        opacity: 0.55,
        ...style,
      }}
    />
  );
}

export function Softphone() {
  const { registered, callState, incomingFrom, error, connect, dial, answer, hangup } =
    useTelnyxClient();
  const [number, setNumber] = useState('');
  const [proNumber, setProNumber] = useState<string | undefined>();

  useEffect(() => {
    connect();
    api.myNumbers().then((nums: any[]) => setProNumber(nums?.[0]?.e164)).catch(() => {});
  }, [connect]);

  const press = (d: string) => setNumber((n) => (n + d).slice(0, 20));
  const back = () => setNumber((n) => n.slice(0, -1));

  const stage = (children: React.ReactNode) => (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 30,
        padding: '22px 16px 26px',
        background: 'linear-gradient(160deg,#dCe9ff 0%,#e9e4ff 50%,#ffe6f3 100%)',
        minHeight: 540,
        maxWidth: 380,
        margin: '0 auto',
      }}
    >
      <Blob color="#7aa8ff" style={{ top: -60, left: -50 }} />
      <Blob color="#c9a7ff" style={{ top: 120, right: -70 }} />
      <Blob color="#ffb3d9" style={{ bottom: -60, left: 40 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );

  // ---- Appel entrant ----
  if (callState === 'ringing') {
    return stage(
      <CallScreen
        title="Appel entrant"
        subtitle={incomingFrom || 'Inconnu'}
        actions={
          <>
            <RoundBtn color="rgba(255,59,48,0.9)" icon="✕" label="Refuser" onClick={hangup} />
            <RoundBtn color="rgba(52,199,89,0.92)" icon="📞" label="Accepter" onClick={answer} />
          </>
        }
      />,
    );
  }

  // ---- En communication / connexion ----
  if (callState === 'active' || callState === 'connecting') {
    return stage(
      <CallScreen
        title={callState === 'active' ? 'Appel en cours' : 'Connexion…'}
        subtitle={number || '—'}
        actions={<RoundBtn color="rgba(255,59,48,0.9)" icon="✕" label="Raccrocher" onClick={hangup} />}
      />,
    );
  }

  // ---- Clavier ----
  return stage(
    <div style={{ textAlign: 'center' }}>
      <div style={{ minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 36, fontWeight: 500, letterSpacing: '0.06em', color: '#1c1c1e' }}>
          {number || <span style={{ color: 'rgba(0,0,0,0.35)' }}>Composer</span>}
        </span>
      </div>

      <div style={{ height: 20, fontSize: 12.5, fontWeight: 600, color: registered ? '#2a8c3f' : 'rgba(0,0,0,0.45)' }}>
        {error ? '' : registered ? '● Prêt' : '○ Connexion…'}
      </div>
      {error && (
        <div style={{ fontSize: 11.5, color: colors.red, marginBottom: 4, padding: '0 12px', wordBreak: 'break-word' }}>
          {error}
        </div>
      )}

      {/* Pavé numérique en verre */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          justifyItems: 'center',
          margin: '10px auto 20px',
          maxWidth: 290,
        }}
      >
        {KEYS.map((k) => (
          <button
            key={k.d}
            onClick={() => press(k.d)}
            style={{
              ...glass,
              width: 76,
              height: 76,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            <span style={{ fontSize: 31, fontWeight: 500, color: '#1c1c1e' }}>{k.d}</span>
            {k.sub && (
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>
                {k.sub}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Appel + retour arrière */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', maxWidth: 290, margin: '0 auto' }}>
        <span />
        <button
          onClick={() => (registered && number ? dial(number, proNumber) : connect())}
          disabled={registered && !number}
          style={{
            ...glass,
            background: 'rgba(52,199,89,0.88)',
            border: '1px solid rgba(255,255,255,0.6)',
            width: 76,
            height: 76,
            borderRadius: '50%',
            color: '#fff',
            fontSize: 32,
            cursor: number || !registered ? 'pointer' : 'default',
            opacity: registered && !number ? 0.45 : 1,
            boxShadow: '0 8px 20px rgba(52,199,89,0.45), inset 0 1px 1px rgba(255,255,255,0.6)',
          }}
        >
          📞
        </button>
        <div style={{ textAlign: 'left', paddingLeft: 16 }}>
          {number && (
            <button onClick={back} style={{ background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: 'rgba(0,0,0,0.5)' }}>
              ⌫
            </button>
          )}
        </div>
      </div>
    </div>,
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
        textAlign: 'center',
        padding: '40px 0',
        minHeight: 460,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ fontSize: 15, color: 'rgba(0,0,0,0.5)' }}>{title}</div>
        <div style={{ fontSize: 32, fontWeight: 600, marginTop: 8, color: '#1c1c1e' }}>{subtitle}</div>
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
          ...glass,
          background: color,
          width: 74,
          height: 74,
          borderRadius: '50%',
          color: '#fff',
          fontSize: 30,
          cursor: 'pointer',
        }}
      >
        {icon}
      </button>
      <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)' }}>{label}</span>
    </div>
  );
}
