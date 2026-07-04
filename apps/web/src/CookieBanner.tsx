import { useEffect, useState } from 'react';

/* ============================================================
   Bannière cookies (RGPD / CNIL).
   Le site n'utilise que des cookies essentiels (session de
   connexion) — la bannière informe, mémorise le choix et
   gouvernera la mesure d'audience si on en ajoute une un jour.
   Choix stocké dans localStorage `joe_cookies` :
   { essential: true, analytics: boolean, ts: ISO }.
   ============================================================ */

const KEY = 'joe_cookies';

export function cookieConsent(): { essential: boolean; analytics: boolean } | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!cookieConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  const save = (analytics: boolean) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ essential: true, analytics, ts: new Date().toISOString() }));
    } catch { /* stockage indisponible : on n'insiste pas */ }
    setVisible(false);
  };

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9999,
      padding: '0 14px 14px', pointerEvents: 'none',
    }}>
      <div style={{
        pointerEvents: 'auto',
        maxWidth: 680, margin: '0 auto',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'saturate(180%) blur(18px)',
        WebkitBackdropFilter: 'saturate(180%) blur(18px)',
        border: '1px solid rgba(27,26,46,0.08)',
        borderRadius: 18,
        boxShadow: '0 18px 50px rgba(27,26,46,0.18)',
        padding: '16px 18px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
      }}>
        <div style={{ fontSize: 26, lineHeight: 1 }}>🍪</div>
        <p style={{ flex: '1 1 260px', margin: 0, fontSize: 13.5, lineHeight: 1.5, color: '#2a2a3a' }}>
          Joe n'utilise que des cookies <b>essentiels</b> (votre session de connexion) — aucun cookie
          publicitaire. Vous pouvez accepter aussi la mesure d'audience anonyme pour nous aider à améliorer
          le service.{' '}
          <a href="/confidentialite" style={{ color: '#7c5cf0', fontWeight: 700 }}>En savoir plus</a>
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => save(false)}
            style={{
              border: '1px solid rgba(27,26,46,0.15)', background: '#fff', color: '#2a2a3a',
              borderRadius: 999, padding: '9px 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Essentiels uniquement
          </button>
          <button
            onClick={() => save(true)}
            style={{
              border: 'none', color: '#fff', cursor: 'pointer',
              background: 'linear-gradient(120deg,#5B8CFF,#7C5CF0)',
              borderRadius: 999, padding: '9px 18px', fontSize: 13.5, fontWeight: 800,
              boxShadow: '0 8px 20px rgba(124,92,240,0.3)',
            }}
          >
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  );
}
