'use client';
import type { Theme } from '@/lib/tokens';
import { LumiereType } from '@/lib/tokens';

interface Props {
  label: string;
  value: number;
  t: Theme;
  onChange?: (v: number) => void;
  interactive?: boolean;
}

export function RatingRow({ label, value, t, onChange, interactive }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <div style={{
        width: 80, flexShrink: 0,
        fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 1.6,
        textTransform: 'uppercase', color: t.creamDim,
      }}>{label}</div>
      <div style={{ flex: 1, display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i}
            onClick={interactive ? () => onChange?.(i) : undefined}
            style={{
              flex: 1, height: 2,
              background: i <= value ? t.cream : t.lineSoft,
              cursor: interactive ? 'pointer' : 'default',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      <div style={{
        width: 18, textAlign: 'right',
        fontFamily: LumiereType.mono, fontSize: 11,
        color: value ? t.cream : t.muted,
      }}>{value || '·'}</div>
    </div>
  );
}

interface EyebrowProps {
  num?: string;
  label: string;
  t: Theme;
  style?: React.CSSProperties;
}
export function Eyebrow({ num, label, t, style }: EyebrowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
      textTransform: 'uppercase', color: t.muted, ...style,
    }}>
      {num && <span style={{ color: t.accent }}>{num}</span>}
      <span>{label}</span>
      <div style={{ flex: 1, height: 1, background: t.line }} />
    </div>
  );
}

interface AvatarProps {
  friend: { initials: string; tint: string };
  size?: number;
  t: Theme;
}
export function Avatar({ friend, size = 32, t }: AvatarProps) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: friend.tint,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: LumiereType.mono, fontSize: size * 0.32,
      letterSpacing: 1, color: t.bg, fontWeight: 600,
      flexShrink: 0,
    }}>{friend.initials}</div>
  );
}
