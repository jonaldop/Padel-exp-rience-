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

export const radius = 14;
export const shadow = '0 1px 4px rgba(0, 0, 0, 0.04)';
export const shadowLg = '0 10px 30px rgba(0, 0, 0, 0.12)';

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
    <div style={{ marginBottom: 16 }}>
      {/* iOS large title */}
      <h2 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '0.01em' }}>{children}</h2>
      {subtitle && <p style={{ margin: '4px 0 0', color: colors.muted, fontSize: 15 }}>{subtitle}</p>}
    </div>
  );
}
