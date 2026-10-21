'use client';
import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Theme } from '@/app/components/lib/tokens';
import { getPersonCredits } from '@/app/components/lib/api';
import type { Person, PersonCredit } from '@/app/components/lib/tmdb';

type Filter = 'all' | 'cast' | 'crew';

export default function PersonPage() {
  const { theme: t } = useTweaks();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id ?? '');
  const [data, setData] = React.useState<{ person: Person; credits: PersonCredit[] } | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<Filter>('all');

  React.useEffect(() => {
    let cancel = false;
    getPersonCredits(id)
      .then(d => { if (!cancel) { if (d) setData(d); else setErr('not found'); } })
      .catch(e => { if (!cancel) setErr(e instanceof Error ? e.message : 'load failed'); });
    return () => { cancel = true; };
  }, [id]);

  const credits = React.useMemo(() => {
    if (!data) return [];
    if (filter === 'cast') return data.credits.filter(c => c.character);
    if (filter === 'crew') return data.credits.filter(c => c.job);
    return data.credits;
  }, [data, filter]);

  if (err) return <Center t={t} text={err} />;
  if (!data) return <Center t={t} text="loading…" />;

  const { person } = data;

  return (
    <div>
      <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
          textTransform: 'uppercase', color: t.muted, marginBottom: 16,
        }}>← back</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {person.profileUrl ? (
            <img src={person.profileUrl} alt="" style={{
              width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
            }} />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: t.surfaceHi,
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: LumiereType.mono, fontSize: 14, color: t.muted,
            }}>{person.name.slice(0, 2).toUpperCase()}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: LumiereType.display, fontSize: 28, lineHeight: 1.05,
              color: t.cream, letterSpacing: -0.6,
            }}>{person.name}</div>
            <div style={{
              fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
              textTransform: 'uppercase', color: t.muted, marginTop: 6,
            }}>
              {person.knownForDept || 'person'} · {data.credits.length} credits
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
          {(['all', 'cast', 'crew'] as Filter[]).map(f => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 12px', cursor: 'pointer',
                  background: active ? t.cream : 'transparent',
                  color: active ? t.bg : t.creamDim,
                  border: `1px solid ${active ? t.cream : t.line}`,
                  fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                  textTransform: 'uppercase',
                }}
              >{f}</button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {credits.length === 0 ? (
          <Center t={t} text="no credits in this filter." tight />
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
            gap: 10,
          }}>
            {credits.map(c => (
              <Link
                key={c.id}
                href={`/films/${encodeURIComponent(c.id)}`}
                style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                title={`${c.title} (${c.year || '—'})${c.character ? ` · ${c.character}` : c.job ? ` · ${c.job}` : ''}`}
              >
                {c.posterUrl ? (
                  <img src={c.posterUrl} alt="" style={{
                    width: '100%', aspectRatio: '2/3', objectFit: 'cover',
                    background: t.surfaceHi, display: 'block',
                  }} />
                ) : (
                  <div style={{
                    width: '100%', aspectRatio: '2/3', background: t.surfaceHi,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: LumiereType.mono, fontSize: 9, color: t.muted,
                    padding: 4, textAlign: 'center', lineHeight: 1.2,
                  }}>{c.title.slice(0, 24)}</div>
                )}
                <div style={{
                  fontFamily: LumiereType.body, fontSize: 12,
                  color: t.cream, marginTop: 6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{c.title}</div>
                <div style={{
                  fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1,
                  color: t.muted, marginTop: 2,
                }}>{c.year || '—'}{c.character ? ` · as ${c.character}` : c.job ? ` · ${c.job.toLowerCase()}` : ''}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Center({ t, text, tight }: { t: Theme; text: string; tight?: boolean }) {
  return (
    <div style={{
      padding: tight ? '24px 0' : '80px 20px', textAlign: 'center',
      fontFamily: LumiereType.body, fontStyle: 'italic',
      fontSize: tight ? 15 : 18, color: t.creamDim,
    }}>{text}</div>
  );
}
