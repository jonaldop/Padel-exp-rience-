import React from 'react';

// Palette iOS (system colors)
export const colors = {
  primary: '#007AFF', // iOS system blue
  primaryDark: '#0066d6',
  primaryGrad: 'linear-gradient(135deg, #34AADC 0%, #007AFF 100%)',
  green: '#34C759', // iOS green (call)
  greenSoft: '#e7f9ec',
  red: '#FF3B30', // iOS red
  redSoft: '#ffecea',
  amber: '#FF9500', // iOS orange
  amberSoft: '#fff4e5',
  bg: '#F2F2F7', // iOS grouped background
  surface: '#ffffff',
  border: '#E5E5EA', // iOS separator (light)
  text: '#000000',
  muted: '#8E8E93', // iOS secondary label
  soft: '#E9E9EB',
};

export const radius = 18;
export const shadow = '0 8px 24px rgba(0, 0, 0, 0.06)';
export const shadowLg = '0 16px 40px rgba(0, 0, 0, 0.14)';

/** Style "Liquid Glass" réutilisable. */
export const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.07), inset 0 1px 1px rgba(255,255,255,0.75)',
};

/** Fond global dégradé + halos colorés (pour l'effet verre). */
export function GlassBackground() {
  const blob = (c: string, s: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: '50%',
    background: c,
    filter: 'blur(90px)',
    opacity: 0.5,
    ...s,
  });
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        background: 'linear-gradient(160deg,#eaf2ff 0%,#f0ecff 45%,#ffeef6 100%)',
      }}
    >
      <div style={blob('#8fb6ff', { top: -120, left: -90 })} />
      <div style={blob('#c9a7ff', { top: '38%', right: -130 })} />
      <div style={blob('#ffb3d9', { bottom: -140, left: '28%' })} />
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  full,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'green' | 'red' | 'ghost' | 'soft';
  type?: 'button' | 'submit';
  disabled?: boolean;
  full?: boolean;
  style?: React.CSSProperties;
}) {
  const glassEdge = {
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.45)',
  };
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: 'rgba(0,122,255,0.92)', color: '#fff', ...glassEdge, boxShadow: '0 8px 20px rgba(0,122,255,0.35), inset 0 1px 1px rgba(255,255,255,0.5)' },
    green: { background: 'rgba(52,199,89,0.92)', color: '#fff', ...glassEdge, boxShadow: '0 8px 20px rgba(52,199,89,0.32), inset 0 1px 1px rgba(255,255,255,0.5)' },
    red: { background: 'rgba(255,59,48,0.92)', color: '#fff', ...glassEdge },
    ghost: { background: 'rgba(255,255,255,0.4)', color: colors.text, ...glassEdge },
    soft: { background: 'rgba(255,255,255,0.55)', color: colors.primary, fontWeight: 700, ...glassEdge },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        border: 'none',
        borderRadius: 12,
        padding: '12px 18px',
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        width: full ? '100%' : undefined,
        ...styles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '13px 14px',
        fontSize: 16,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        background: '#fff',
        ...props.style,
      }}
    />
  );
}

export function Card({
  children,
  style,
  onClick,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        ...glass,
        borderRadius: radius,
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.muted, marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

/** Pastille colorée avec icône (emoji). */
export function IconChip({ icon, color = colors.primary, bg }: { icon: string; color?: string; bg?: string }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: bg || colors.soft,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        color,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
  );
}

export function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color,
        background: bg,
      }}
    >
      {children}
    </span>
  );
}

export function PageTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {/* iOS large title */}
      <h2 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '0.01em' }}>{children}</h2>
      {subtitle && <p style={{ margin: '4px 0 0', color: colors.muted, fontSize: 15 }}>{subtitle}</p>}
    </div>
  );
}
