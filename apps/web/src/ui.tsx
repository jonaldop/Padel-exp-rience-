import React from 'react';

export const colors = {
  primary: '#2563eb',
  green: '#16a34a',
  red: '#dc2626',
  bg: '#f7f8fa',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
};

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'green' | 'red' | 'ghost';
  type?: 'button' | 'submit';
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const bg =
    variant === 'green'
      ? colors.green
      : variant === 'red'
        ? colors.red
        : variant === 'ghost'
          ? 'transparent'
          : colors.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg,
        color: variant === 'ghost' ? colors.text : 'white',
        border: variant === 'ghost' ? `1px solid ${colors.border}` : 'none',
        borderRadius: 10,
        padding: '10px 16px',
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
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
        padding: 11,
        fontSize: 15,
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        boxSizing: 'border-box',
        ...props.style,
      }}
    />
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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
      <span style={{ display: 'block', fontSize: 13, color: colors.muted, marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  );
}
