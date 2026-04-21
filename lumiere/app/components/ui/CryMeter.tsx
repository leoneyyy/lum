'use client';
import React from 'react';
import type { Theme } from '@/app/components/lib/tokens';
import { LumiereType } from '@/app/components/lib/tokens';

export type CryStyle = 'bar' | 'dots' | 'wave';

interface Props {
  value: number;
  t: Theme;
  style?: CryStyle;
  large?: boolean;
  interactive?: boolean;
  onChange?: (v: number) => void;
}

export function CryMeter({ value, t, style = 'bar', large, interactive, onChange }: Props) {
  if (style === 'dots') return <Dots value={value} t={t} large={large} />;
  if (style === 'wave') return <Wave value={value} t={t} large={large} />;
  return <Bar value={value} t={t} large={large} interactive={interactive} onChange={onChange} />;
}

function Bar({ value, t, large, interactive, onChange }: Omit<Props, 'style'>) {
  const v = Math.max(0, Math.min(100, value));
  const ref = React.useRef<HTMLDivElement | null>(null);
  const handle = (e: React.PointerEvent) => {
    if (!interactive || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    onChange?.(Math.round(pct));
  };
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: LumiereType.mono, fontSize: large ? 10 : 8, letterSpacing: 1.8,
        textTransform: 'uppercase', color: t.muted, marginBottom: large ? 10 : 6,
      }}>
        <span>dry</span>
        <span style={{ color: t.signal }}>{v.toString().padStart(3, '0')}</span>
        <span>sobbing</span>
      </div>
      <div
        ref={ref}
        onPointerDown={interactive ? (e) => { e.currentTarget.setPointerCapture(e.pointerId); handle(e); } : undefined}
        onPointerMove={interactive ? (e) => { if (e.buttons) handle(e); } : undefined}
        style={{
          position: 'relative', height: large ? 6 : 4, background: t.lineSoft,
          cursor: interactive ? 'pointer' : 'default', touchAction: 'none',
        }}
      >
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${v}%`, background: t.cream,
          transition: interactive ? 'none' : 'width 0.6s ease',
        }} />
        {interactive && (
          <div style={{
            position: 'absolute', left: `${v}%`, top: '50%',
            transform: 'translate(-50%, -50%)',
            width: large ? 18 : 12, height: large ? 18 : 12,
            background: t.cream, borderRadius: '50%',
            boxShadow: `0 0 0 2px ${t.bg}`,
          }} />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, height: 4 }}>
        {[0, 1, 2, 3, 4].map(i => <div key={i} style={{ width: 1, height: 4, background: t.line }} />)}
      </div>
    </div>
  );
}

function Dots({ value, t, large }: { value: number; t: Theme; large?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        height: large ? 40 : 28, marginBottom: 6,
      }}>
        {[0, 25, 50, 75, 100].map((threshold, i) => {
          const active = v >= threshold - 5;
          const size = 3 + i * (large ? 2.2 : 1.4);
          return <div key={i} style={{
            width: size, height: size, borderRadius: '50%',
            background: active ? t.cream : t.lineSoft, transition: 'background 0.3s ease',
          }} />;
        })}
      </div>
      <div style={{ height: 1, background: t.line }} />
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.8,
        textTransform: 'uppercase', color: t.muted, marginTop: 6,
      }}>
        <span>dry</span>
        <span style={{ color: t.signal }}>tears · {v}</span>
        <span>flood</span>
      </div>
    </div>
  );
}

function Wave({ value, t, large }: { value: number; t: Theme; large?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  const h = large ? 50 : 36;
  const w = 300;
  const amp = (v / 100) * (h / 2 - 4);
  const pts: string[] = [];
  for (let x = 0; x <= w; x += 4) {
    const y = h / 2 + Math.sin((x / w) * Math.PI * 6) * amp * (0.6 + 0.4 * Math.sin((x / w) * 11));
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }} preserveAspectRatio="none">
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke={t.line} strokeWidth="0.5" />
        <polyline points={pts.join(' ')} fill="none" stroke={t.cream} strokeWidth="1.2" />
      </svg>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.8,
        textTransform: 'uppercase', color: t.muted, marginTop: 4,
      }}>
        <span>flat</span>
        <span style={{ color: t.signal }}>amplitude · {v}</span>
        <span>symphonic</span>
      </div>
    </div>
  );
}
