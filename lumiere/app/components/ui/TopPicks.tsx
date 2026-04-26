'use client';
import React from 'react';
import Link from 'next/link';
import type { Theme } from '@/app/components/lib/tokens';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Film, LogEntry, MediaKind } from '@/app/components/lib/types';
import { Poster } from '@/app/components/ui/Poster';

const SLOT_W = 80;
const SLOT_H = 116;
const MAX = 4;

export function TopPicksGrid({
  picks, films, t, label, onAdd, onRemove,
}: {
  picks: string[];
  films: Record<string, Film>;
  t: Theme;
  label: string;
  onAdd?: () => void;
  onRemove?: (filmId: string) => void;
}) {
  const slots: (string | null)[] = Array.from({ length: MAX }, (_, i) => picks[i] ?? null);
  return (
    <div>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
        textTransform: 'uppercase', color: t.muted, marginBottom: 10,
      }}>{label}</div>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${MAX}, 1fr)`, gap: 8,
      }}>
        {slots.map((id, i) => {
          const film = id ? films[id] : null;
          if (!id) {
            return (
              <button key={`empty-${i}`} onClick={onAdd} disabled={!onAdd} style={{
                aspectRatio: `${SLOT_W}/${SLOT_H}`,
                background: 'transparent', cursor: onAdd ? 'pointer' : 'default',
                border: `1px dashed ${t.line}`, color: t.muted,
                fontFamily: LumiereType.mono, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>+</button>
            );
          }
          return (
            <div key={id} style={{ position: 'relative', aspectRatio: `${SLOT_W}/${SLOT_H}` }}>
              <Link href={`/films/${encodeURIComponent(id)}`} style={{
                display: 'block', width: '100%', height: '100%',
                textDecoration: 'none', color: 'inherit',
              }}>
                {film ? (
                  <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                    <Poster film={film} size="sm" t={t} style={{ width: '100%', height: '100%' }} />
                  </div>
                ) : (
                  <div style={{
                    width: '100%', height: '100%', background: t.surfaceHi,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: LumiereType.mono, fontSize: 9, color: t.muted,
                  }}>…</div>
                )}
              </Link>
              {onRemove && (
                <button onClick={() => onRemove(id)} style={{
                  position: 'absolute', top: 4, right: 4,
                  background: 'rgba(0,0,0,0.7)', border: `1px solid ${t.line}`,
                  cursor: 'pointer', padding: '2px 5px',
                  fontFamily: LumiereType.mono, fontSize: 9, color: t.cream,
                }}>×</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TopPicksPicker({
  kind, entries, films, current, t, onPick, onClose,
}: {
  kind: MediaKind;
  entries: LogEntry[];
  films: Record<string, Film>;
  current: string[];
  t: Theme;
  onPick: (filmId: string) => void;
  onClose: () => void;
}) {
  // collect distinct candidate film ids, in most-recent-first order
  const seen = new Set(current);
  const candidates: { id: string; film: Film }[] = [];
  for (const e of entries) {
    const f = films[e.filmId];
    if (!f) continue;
    if (f.kind !== kind) continue;
    if (seen.has(e.filmId)) continue;
    seen.add(e.filmId);
    candidates.push({ id: e.filmId, film: f });
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: t.bg, borderTop: `1px solid ${t.line}`,
        padding: '20px 20px 34px', maxHeight: '70vh', overflow: 'auto',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 14,
        }}>
          <div style={{
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: t.muted,
          }}>§ pick a {kind === 'film' ? 'film' : 'series'}</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: t.creamDim,
          }}>close</button>
        </div>
        {candidates.length === 0 ? (
          <div style={{
            padding: '12px 0', fontFamily: LumiereType.body, fontStyle: 'italic',
            fontSize: 14, color: t.creamDim,
          }}>nothing eligible. log some {kind === 'film' ? 'films' : 'series'} first.</div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
            gap: 8,
          }}>
            {candidates.map(({ id, film }) => (
              <button key={id} onClick={() => onPick(id)} style={{
                padding: 0, border: `1px solid ${t.line}`,
                background: t.surfaceHi, cursor: 'pointer', overflow: 'hidden',
                aspectRatio: '80/116',
              }}>
                <Poster film={film} size="sm" t={t} style={{ width: '100%', height: '100%' }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
