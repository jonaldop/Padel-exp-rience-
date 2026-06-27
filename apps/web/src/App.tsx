import { useEffect, useState } from 'react';
import { api, auth } from './api';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Numbers } from './pages/Numbers';
import { Voicemails } from './pages/Voicemails';
import { Softphone } from './softphone/Softphone';
import { colors } from './ui';
import { useIsMobile } from './useIsMobile';

type Tab = 'dashboard' | 'numbers' | 'messages' | 'softphone';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Accueil', icon: '📊' },
  { key: 'numbers', label: 'Numéros', icon: '☎️' },
  { key: 'messages', label: 'Messages', icon: '🎙️' },
  { key: 'softphone', label: 'Appeler', icon: '📞' },
];

export function App() {
  const [authed, setAuthed] = useState(Boolean(auth.token));
  const [me, setMe] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (authed) api.me().then(setMe).catch(() => logout());
  }, [authed]);

  function logout() {
    auth.token = null;
    setAuthed(false);
    setMe(null);
  }

  if (!authed) return <Login onLoggedIn={() => setAuthed(true)} />;

  const Brand = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: colors.primaryGrad,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}
      >
        📞
      </div>
      <strong style={{ fontSize: 17, letterSpacing: '-0.02em' }}>Standard Pro</strong>
    </div>
  );

  const content = (
    <div className="fade-up" key={tab}>
      {tab === 'dashboard' && <Dashboard companyName={me?.account?.companyName} />}
      {tab === 'numbers' && <Numbers />}
      {tab === 'messages' && <Voicemails />}
      {tab === 'softphone' && <Softphone />}
    </div>
  );

  return (
    <div style={{ background: colors.bg, minHeight: '100vh' }}>
      <header
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'saturate(180%) blur(10px)',
          borderBottom: `1px solid ${colors.border}`,
          padding: isMobile ? '12px 16px' : '14px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        {Brand}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {!isMobile && (
            <span style={{ color: colors.muted, fontSize: 14 }}>{me?.account?.companyName || ''}</span>
          )}
          <button
            onClick={logout}
            style={{
              background: colors.soft,
              border: 'none',
              borderRadius: 10,
              padding: '8px 12px',
              color: colors.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      {isMobile ? (
        <>
          <main style={{ padding: 16, paddingBottom: 96, maxWidth: 560, margin: '0 auto' }}>{content}</main>
          <nav
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'saturate(180%) blur(10px)',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-around',
              padding: '8px 6px calc(10px + env(safe-area-inset-bottom))',
              zIndex: 10,
            }}
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    flex: 1,
                    color: active ? colors.primary : colors.muted,
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      width: 46,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      background: active ? '#eef0ff' : 'transparent',
                    }}
                  >
                    {t.icon}
                  </span>
                  {t.label}
                </button>
              );
            })}
          </nav>
        </>
      ) : (
        <div style={{ display: 'flex', maxWidth: 1120, margin: '0 auto' }}>
          <nav style={{ width: 230, padding: 18 }}>
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    marginBottom: 6,
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 15,
                    background: active ? colors.primaryGrad : 'transparent',
                    color: active ? '#fff' : colors.text,
                    fontWeight: active ? 700 : 500,
                    boxShadow: active ? '0 6px 16px rgba(79,70,229,0.25)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{t.icon}</span> {t.label}
                </button>
              );
            })}
          </nav>
          <main style={{ flex: 1, padding: 22, maxWidth: 860 }}>{content}</main>
        </div>
      )}
    </div>
  );
}
