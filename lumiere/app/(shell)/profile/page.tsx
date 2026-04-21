'use client';
import React from 'react';
import { useTweaks } from '@/app/components/TweaksProvider';
import {
  LumiereType, LumiereThemes, DEFAULT_DIMS,
} from '@/app/components/lib/tokens';
import type { ThemeKey, Voice, DimKey } from '@/app/components/lib/tokens';
import { useLog } from '@/app/components/lib/logStore';
import { CryMeter } from '@/app/components/ui/CryMeter';
import type { CryStyle } from '@/app/components/ui/CryMeter';
import { Eyebrow } from '@/app/components/ui/Primitives';

const THEMES: ThemeKey[] = ['indigo', 'oxblood', 'bone', 'acid'];
const VOICES: Voice[] = ['dry', 'poetic', 'playful'];
const CRY_STYLES: CryStyle[] = ['bar', 'dots', 'wave'];

export default function ProfilePage() {
  const { theme: t, tweaks, setTweaks } = useTweaks();
  const entries = useLog();
  const avg = entries.length ? Math.round(entries.reduce((s, e) => s + e.cry, 0) / entries.length) : 0;
  const max = entries.reduce((m, e) => Math.max(m, e.cry), 0);

  const toggleDim = (k: DimKey) => setTweaks(prev => ({
    ...prev,
    dims: prev.dims.includes(k) ? prev.dims.filter(d => d !== k) : [...prev.dims, k],
  }));

  return (
    <div>
      <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>§ self</div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 48, lineHeight: 0.95,
          color: t.cream, letterSpacing: -1.4, marginBottom: 10,
        }}>the<br/><span style={{ fontStyle: 'italic', color: t.signal }}>witness</span></div>
        <div style={{
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
          color: t.creamDim,
        }}>recorder of {entries.length} nights.</div>
      </div>

      <div style={{ padding: '20px' }}>
        <Eyebrow num="01" label="instrument" t={t} style={{ marginBottom: 12 }} />
        <Stat t={t} label="logged" value={entries.length.toString().padStart(3, '0')} />
        <Stat t={t} label="avg cry" value={avg.toString().padStart(3, '0')} />
        <Stat t={t} label="peak cry" value={max.toString().padStart(3, '0')} />

        <div style={{ height: 28 }} />
        <Eyebrow num="02" label="theme" t={t} style={{ marginBottom: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {THEMES.map(key => {
            const th = LumiereThemes[key];
            const active = tweaks.theme === key;
            return (
              <button key={key} onClick={() => setTweaks(p => ({ ...p, theme: key }))} style={{
                padding: 12, cursor: 'pointer', textAlign: 'left',
                background: th.bg, color: th.cream,
                border: `1px solid ${active ? th.cream : t.line}`,
              }}>
                <div style={{
                  fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                  textTransform: 'uppercase', color: th.muted, marginBottom: 6,
                }}>{key}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[th.cream, th.signal, th.accent, th.muted].map((c, i) => (
                    <div key={i} style={{ flex: 1, height: 16, background: c }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ height: 28 }} />
        <Eyebrow num="03" label="cry style" t={t} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {CRY_STYLES.map(s => {
            const active = tweaks.cryStyle === s;
            return (
              <button key={s} onClick={() => setTweaks(p => ({ ...p, cryStyle: s }))} style={{
                padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                background: active ? t.surface : 'transparent',
                color: 'inherit', border: `1px solid ${active ? t.cream : t.line}`,
              }}>
                <div style={{
                  fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                  textTransform: 'uppercase', color: t.muted, marginBottom: 8,
                }}>{s}</div>
                <CryMeter value={62} t={t} style={s} />
              </button>
            );
          })}
        </div>

        <div style={{ height: 28 }} />
        <Eyebrow num="04" label="voice" t={t} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {VOICES.map(v => {
            const active = tweaks.voice === v;
            return (
              <button key={v} onClick={() => setTweaks(p => ({ ...p, voice: v }))} style={{
                flex: 1, padding: '10px 0', cursor: 'pointer',
                background: active ? t.cream : 'transparent',
                color: active ? t.bg : t.creamDim,
                border: `1px solid ${active ? t.cream : t.line}`,
                fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
                textTransform: 'uppercase',
              }}>{v}</button>
            );
          })}
        </div>

        <div style={{ height: 28 }} />
        <Eyebrow num="05" label="dimensions" t={t} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DEFAULT_DIMS.map(d => {
            const active = tweaks.dims.includes(d.key as DimKey);
            return (
              <button key={d.key} onClick={() => toggleDim(d.key as DimKey)} style={{
                padding: '6px 12px', cursor: 'pointer',
                background: active ? t.cream : 'transparent',
                color: active ? t.bg : t.creamDim,
                border: `1px solid ${active ? t.cream : t.line}`,
                fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}>{d.label}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ t, label, value }: { t: ReturnType<typeof useTweaks>['theme']; label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '10px 0', borderBottom: `1px solid ${t.lineSoft}`,
    }}>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 1.6,
        textTransform: 'uppercase', color: t.muted,
      }}>{label}</div>
      <div style={{
        fontFamily: LumiereType.display, fontSize: 28, lineHeight: 1,
        color: t.cream, letterSpacing: -0.6,
      }}>{value}</div>
    </div>
  );
}
