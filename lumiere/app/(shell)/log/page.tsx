'use client';
import React from 'react';
import Link from 'next/link';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType, LumiereVoice } from '@/app/components/lib/tokens';
import { useLog, deleteEntry } from '@/app/components/lib/logStore';
import type { Film, LogEntry } from '@/app/components/lib/types';
import { useFilmOverrides, applyOverride } from '@/app/components/lib/filmOverrides';
import { useFilmsForEntries } from '@/app/components/lib/useFilms';
import { Poster } from '@/app/components/ui/Poster';
import { CryMeter } from '@/app/components/ui/CryMeter';

export default function LogPage() {
  const { theme: t, tweaks } = useTweaks();
  const entries = useLog();
  const rawFilms = useFilmsForEntries(entries);
  const overrides = useFilmOverrides();
  const films = React.useMemo<Record<string, Film>>(() => {
    const out: Record<string, Film> = {};
    for (const [id, f] of Object.entries(rawFilms)) {
      out[id] = overrides[id] ? applyOverride(f, overrides[id]) : f;
    }
    return out;
  }, [rawFilms, overrides]);

  const voice = LumiereVoice[tweaks.voice];
  const greeting = voice.greeting[entries.length % voice.greeting.length];

  return (
    <div>
      <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 14,
        }}>§ the logbook</div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: 44, lineHeight: 0.95,
          color: t.cream, letterSpacing: -1.2,
        }}>
          <span style={{ fontStyle: 'italic', color: t.signal }}>{entries.length.toString().padStart(3, '0')}</span>
          {' '}entries
        </div>
        <div style={{
          fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 16,
          color: t.creamDim, marginTop: 12,
        }}>{greeting}</div>

        <Link href="/search" style={{
          display: 'block', marginTop: 18, padding: '14px 0', textAlign: 'center',
          background: t.cream, color: t.bg, textDecoration: 'none',
          fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2.5,
          textTransform: 'uppercase',
        }}>+ new entry</Link>
      </div>

      <div style={{ padding: '20px' }}>
        {entries.length === 0 ? (
          <EmptyState t={t} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {entries.map(e => (
              <EntryCard key={e.id} entry={e} film={films[e.filmId] || null} t={t} style={tweaks.cryStyle} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EntryCard({
  entry, film, t, style,
}: {
  entry: LogEntry;
  film: Film | null;
  t: ReturnType<typeof useTweaks>['theme'];
  style: ReturnType<typeof useTweaks>['tweaks']['cryStyle'];
}) {
  const ratingCount = Object.values(entry.ratings).filter(Boolean).length;
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      {film
        ? <Link href={`/films/${encodeURIComponent(film.id)}`}><Poster film={film} size="sm" t={t} /></Link>
        : <div style={{
            width: 72, height: 104, background: t.surfaceHi, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: LumiereType.mono, fontSize: 10, color: t.muted,
          }}>?</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 4,
        }}>
          <div style={{
            fontFamily: LumiereType.display, fontSize: 20, lineHeight: 1,
            color: t.cream, letterSpacing: -0.4,
          }}>{film?.title || 'unknown film'}</div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            {film && (
              <Link
                href={`/films/${encodeURIComponent(film.id)}?edit=${encodeURIComponent(entry.id)}`}
                style={{
                  padding: 0, textDecoration: 'none',
                  fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.4,
                  textTransform: 'uppercase', color: t.creamDim,
                }}
              >edit</Link>
            )}
            <button onClick={() => deleteEntry(entry.id)} style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.4,
              textTransform: 'uppercase', color: t.muted,
            }}>erase</button>
          </div>
        </div>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.6,
          textTransform: 'uppercase', color: t.muted, marginBottom: 10,
        }}>
          {new Date(entry.createdAt).toLocaleDateString()} · {ratingCount} dim · cry {entry.cry} · {entry.visibility === 'public' ? 'public' : 'private'}
        </div>
        <CryMeter value={entry.cry} t={t} style={style} />
        {entry.note && (
          <div style={{
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
            color: t.creamDim, lineHeight: 1.4, marginTop: 10,
          }}>{entry.note}</div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ t }: { t: ReturnType<typeof useTweaks>['theme'] }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{
        fontFamily: LumiereType.display, fontSize: 28, lineHeight: 1,
        color: t.cream, letterSpacing: -0.6, marginBottom: 12,
      }}>blank page.</div>
      <div style={{
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 16,
        color: t.creamDim, lineHeight: 1.4,
      }}>the first entry is always the hardest. find something you watched.</div>
    </div>
  );
}
