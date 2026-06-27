import React from 'react';

export const colors = {
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  primaryGrad: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  green: '#10b981',
  greenSoft: '#ecfdf5',
  red: '#ef4444',
  redSoft: '#fef2f2',
  amber: '#f59e0b',
  amberSoft: '#fffbeb',
  bg: '#f6f7fb',
  surface: '#ffffff',
  border: '#ecedf3',
  text: '#0f172a',
  muted: '#64748b',
  soft: '#f1f3f9',
};

export const radius = 16;
export const shadow = '0 2px 10px rgba(15, 23, 42, 0.05)';
export const shadowLg = '0 12px 32px rgba(15, 23, 42, 0.10)';

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
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: colors.primaryGrad, color: '#fff', boxShadow: '0 6px 16px rgba(79,70,229,0.30)' },
    green: { background: colors.green, color: '#fff', boxShadow: '0 6px 16px rgba(16,185,129,0.28)' },
    red: { background: colors.red, color: '#fff' },
    ghost: { background: 'transparent', color: colors.text, border: `1px solid ${colors.border}` },
    soft: { background: colors.soft, color: colors.primary, fontWeight: 700 },
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
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius,
        padding: 18,
        boxShadow: shadow,
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
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{children}</h2>
      {subtitle && <p style={{ margin: '4px 0 0', color: colors.muted, fontSize: 14 }}>{subtitle}</p>}
    </div>
  );
}
