import { useEffect, useState } from 'react';
import { api, auth } from './api';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Numbers } from './pages/Numbers';
import { Softphone } from './softphone/Softphone';
import { colors } from './ui';
import { useIsMobile } from './useIsMobile';

type Tab = 'dashboard' | 'numbers' | 'softphone';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: '📊' },
  { key: 'numbers', label: 'Mes numéros', icon: '☎️' },
  { key: 'softphone', label: 'Softphone', icon: '📞' },
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

  return (
    <div style={{ background: colors.bg, minHeight: '100vh' }}>
      {/* En-tête */}
      <header
        style={{
          background: 'white',
          borderBottom: `1px solid ${colors.border}`,
          padding: isMobile ? '12px 16px' : '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <strong style={{ fontSize: 17 }}>📞 Standard Pro</strong>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {!isMobile && (
            <span style={{ color: colors.muted, fontSize: 14 }}>{me?.account?.companyName || ''}</span>
          )}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              logout();
            }}
            style={{ color: colors.primary, fontSize: 14 }}
          >
            Déconnexion
          </a>
        </div>
      </header>

      {isMobile ? (
        /* ---- MOBILE : contenu pleine largeur + barre d'onglets en bas ---- */
        <>
          <main style={{ padding: 14, paddingBottom: 90 }}>
            {tab === 'dashboard' && <Dashboard />}
            {tab === 'numbers' && <Numbers />}
            {tab === 'softphone' && <Softphone />}
          </main>
          <nav
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'white',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-around',
              padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
              zIndex: 10,
            }}
          >
            {TABS.map((t) => (
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
                  gap: 2,
                  fontSize: 11,
                  flex: 1,
                  color: tab === t.key ? colors.primary : colors.muted,
                  fontWeight: tab === t.key ? 700 : 400,
                }}
              >
                <span style={{ fontSize: 20 }}>{t.icon}</span>
                {t.label.split(' ')[0]}
              </button>
            ))}
          </nav>
        </>
      ) : (
        /* ---- DESKTOP : menu latéral ---- */
        <div style={{ display: 'flex', maxWidth: 1100, margin: '0 auto' }}>
          <nav style={{ width: 220, padding: 16 }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '11px 14px',
                  marginBottom: 6,
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 15,
                  background: tab === t.key ? colors.primary : 'transparent',
                  color: tab === t.key ? 'white' : colors.text,
                  fontWeight: tab === t.key ? 600 : 400,
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
          <main style={{ flex: 1, padding: 16 }}>
            {tab === 'dashboard' && <Dashboard />}
            {tab === 'numbers' && <Numbers />}
            {tab === 'softphone' && <Softphone />}
          </main>
        </div>
      )}
    </div>
  );
}
