'use client';
import React from 'react';
import Link from 'next/link';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType, LumiereVoice } from '@/app/components/lib/tokens';
import { useLog } from '@/app/components/lib/logStore';
import { useFilmsForEntries } from '@/app/components/lib/useFilms';
import { useFilmOverrides, applyOverride } from '@/app/components/lib/filmOverrides';
import type { Film, LogEntry } from '@/app/components/lib/types';
import { CryMeter } from '@/app/components/ui/CryMeter';

const FEED_LIMIT = 5;

export default function HomePage() {
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

  const feed = entries.slice(0, FEED_LIMIT);
  const voice = LumiereVoice[tweaks.voice];

  const issueNum = String(Math.min(999, Math.max(1, entries.length || 1))).padStart(3, '0');
  const today = React.useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase();
  }, []);

  return (
    <div>
      <div style={{ padding: '8px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 20,
        }}>
          <span>lumiere</span>
          <span>vol. iii · no. {issueNum}</span>
          <span>{today}</span>
        </div>
        <div style={{
          fontFamily: LumiereType.display, fontSize: entries.length ? 40 : 56,
          lineHeight: 0.9, color: t.cream, letterSpacing: -2,
        }}>
          the<br/><span style={{ fontStyle: 'italic', color: t.signal }}>log</span>book
        </div>
        <div style={{
          fontFamily: LumiereType.body, fontSize: 17, fontStyle: 'italic',
          color: t.creamDim, marginTop: 16,
        }}>{voice.greeting[entries.length % voice.greeting.length]}</div>
      </div>

      {entries.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <>
          <div style={{ padding: '24px 20px 8px' }}>
            <div style={{
              fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
              textTransform: 'uppercase', color: t.muted,
            }}>§ recent dispatches</div>
          </div>
          <div>
            {feed.map((e, i) => (
              <ArticleCard
                key={e.id}
                entry={e}
                film={films[e.filmId] || null}
                t={t}
                cryStyle={tweaks.cryStyle}
                index={i}
              />
            ))}
          </div>
          {entries.length > FEED_LIMIT && (
            <div style={{ padding: '8px 20px 32px' }}>
              <Link href="/log" style={{
                display: 'block', padding: '14px 0', textAlign: 'center',
                border: `1px solid ${t.line}`, color: t.cream, textDecoration: 'none',
                fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2.5,
                textTransform: 'uppercase',
              }}>view all {entries.length} entries →</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ t }: { t: ReturnType<typeof useTweaks>['theme'] }) {
  return (
    <div style={{ padding: '32px 20px 48px' }}>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
        textTransform: 'uppercase', color: t.muted, marginBottom: 10,
      }}>§ getting started</div>
      <Link href="/search" style={{
        display: 'block', padding: '18px 0', textAlign: 'center',
        background: t.cream, color: t.bg, cursor: 'pointer',
        fontFamily: LumiereType.mono, fontSize: 11, letterSpacing: 3,
        textTransform: 'uppercase', textDecoration: 'none',
      }}>search the archive →</Link>
    </div>
  );
}

function ArticleCard({
  entry, film, t, cryStyle, index,
}: {
  entry: LogEntry;
  film: Film | null;
  t: ReturnType<typeof useTweaks>['theme'];
  cryStyle: ReturnType<typeof useTweaks>['tweaks']['cryStyle'];
  index: number;
}) {
  const ratingCount = Object.values(entry.ratings).filter(Boolean).length;
  const date = new Date(entry.createdAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  }).toLowerCase();
  const num = String(index + 1).padStart(2, '0');
  const href = film ? `/films/${encodeURIComponent(film.id)}` : '#';

  return (
    <article style={{
      borderTop: index === 0 ? 'none' : `1px solid ${t.line}`,
      padding: '20px 0 24px',
    }}>
      <Link href={href} style={{
        display: 'block', color: 'inherit', textDecoration: 'none',
      }}>
        {film?.backdropUrl ? (
          <div style={{
            position: 'relative', height: 180, overflow: 'hidden',
            marginBottom: 16,
          }}>
            <img src={film.backdropUrl} alt="" style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: 'brightness(0.5) saturate(0.85)',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(180deg, transparent 30%, ${t.bg})`,
            }} />
            <div style={{
              position: 'absolute', left: 20, right: 20, bottom: 14,
            }}>
              <div style={{
                fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
                textTransform: 'uppercase', color: t.creamDim, marginBottom: 6,
              }}>no. {num} · {date}</div>
              <div style={{
                fontFamily: LumiereType.display, fontSize: 30, lineHeight: 1,
                color: t.cream, letterSpacing: -0.8,
              }}>{film.title}</div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '0 20px', marginBottom: 14 }}>
            <div style={{
              fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
              textTransform: 'uppercase', color: t.muted, marginBottom: 6,
            }}>no. {num} · {date}</div>
            <div style={{
              fontFamily: LumiereType.display, fontSize: 28, lineHeight: 1,
              color: t.cream, letterSpacing: -0.6,
            }}>{film?.title || 'unknown film'}</div>
          </div>
        )}

        <div style={{ padding: '0 20px' }}>
          {film && (
            <div style={{
              fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
              textTransform: 'uppercase', color: t.muted, marginBottom: 14,
            }}>
              {[
                film.year ? String(film.year) : null,
                film.dir ? `dir. ${film.dir}` : null,
                film.runtime ? `${film.runtime}m` : null,
                film.kind,
              ].filter(Boolean).join(' · ')}
            </div>
          )}

          {entry.note ? (
            <blockquote style={{
              margin: '0 0 18px', padding: '0 0 0 14px',
              borderLeft: `2px solid ${t.accent}`,
              fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 19,
              lineHeight: 1.4, color: t.cream,
            }}>{entry.note}</blockquote>
          ) : (
            <div style={{
              fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
              color: t.muted, marginBottom: 18,
            }}>no note · {ratingCount} dimensions rated</div>
          )}

          <CryMeter value={entry.cry} t={t} style={cryStyle} />
        </div>
      </Link>
    </article>
  );
}
