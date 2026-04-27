'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useTweaks } from '@/app/components/TweaksProvider';
import { LumiereType } from '@/app/components/lib/tokens';
import type { Theme } from '@/app/components/lib/tokens';
import { useAuth } from '@/app/components/AuthProvider';
import { searchFilms } from '@/app/components/lib/api';
import { importEntries } from '@/app/components/lib/logStore';
import { markManyWatched } from '@/app/components/lib/watchedStore';
import type { Film } from '@/app/components/lib/types';
import { Eyebrow } from '@/app/components/ui/Primitives';
import { Poster } from '@/app/components/ui/Poster';

interface DiaryRow {
  date: string;          // "Date" — when added to letterboxd
  watchedDate: string;   // "Watched Date" — when actually watched
  name: string;
  year: string;
  uri: string;
  rating: string;        // 0.5 .. 5.0
  rewatch: string;       // "Yes" | ""
  review?: string;       // joined from reviews.csv
}

interface Match {
  row: DiaryRow;
  status: 'pending' | 'matched' | 'unmatched' | 'error';
  film?: Film;
  error?: string;
}

export default function ImportPage() {
  const { theme: t } = useTweaks();
  const router = useRouter();
  const auth = useAuth();
  const [diary, setDiary] = React.useState<DiaryRow[] | null>(null);
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [phase, setPhase] = React.useState<'idle' | 'matching' | 'preview' | 'importing' | 'done'>('idle');
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [result, setResult] = React.useState<{ imported: number; skipped: number; error?: string } | null>(null);
  const [topMsg, setTopMsg] = React.useState<string | null>(null);

  const onDiary = async (file: File) => {
    setTopMsg(null);
    try {
      const text = await file.text();
      const rows = parseDiaryCSV(text);
      setDiary(rows);
    } catch (e) {
      setTopMsg(e instanceof Error ? e.message : 'failed to parse diary.csv');
    }
  };

  const onReviews = async (file: File) => {
    setTopMsg(null);
    if (!diary) {
      setTopMsg('upload diary.csv first');
      return;
    }
    try {
      const text = await file.text();
      const reviewByUri = parseReviewsCSV(text);
      setDiary(diary.map(r => ({ ...r, review: reviewByUri.get(r.uri) })));
    } catch (e) {
      setTopMsg(e instanceof Error ? e.message : 'failed to parse reviews.csv');
    }
  };

  const startMatching = async () => {
    if (!diary || diary.length === 0) return;
    setPhase('matching');
    setProgress({ done: 0, total: diary.length });
    const initial: Match[] = diary.map(row => ({ row, status: 'pending' }));
    setMatches(initial);

    const results = [...initial];
    let done = 0;
    const concurrency = 4;
    let cursor = 0;

    const worker = async () => {
      while (cursor < diary.length) {
        const i = cursor++;
        const row = diary[i];
        try {
          const film = await matchFilm(row);
          results[i] = film
            ? { row, status: 'matched', film }
            : { row, status: 'unmatched' };
        } catch (e) {
          results[i] = { row, status: 'error', error: e instanceof Error ? e.message : 'failed' };
        }
        done += 1;
        setProgress({ done, total: diary.length });
        if (done % 4 === 0 || done === diary.length) {
          setMatches([...results]);
        }
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    setMatches(results);
    setPhase('preview');
  };

  const submit = async () => {
    setPhase('importing');
    const items = matches
      .filter(m => m.status === 'matched' && m.film)
      .map(m => ({
        filmId: m.film!.id,
        cry: m.row.rating ? Math.round(parseFloat(m.row.rating) * 20) : 0,
        note: m.row.review?.trim() || undefined,
        createdAt: toIso(m.row.watchedDate || m.row.date),
        visibility: 'private' as const,
      }));
    const r = await importEntries(items);
    if (!r.error) {
      const filmIds = items.map(i => i.filmId);
      void markManyWatched(filmIds);
    }
    setResult(r);
    setPhase('done');
  };

  if (auth.status !== 'anon' && auth.status !== 'user') {
    return (
      <div style={{ padding: 20 }}>
        <Header t={t} onBack={() => router.back()} />
        <div style={{
          padding: 30, textAlign: 'center', border: `1px dashed ${t.line}`,
          fontFamily: LumiereType.body, fontStyle: 'italic', color: t.creamDim,
        }}>connect to import. local mode can&apos;t talk to the backend.</div>
      </div>
    );
  }

  return (
    <div>
      <Header t={t} onBack={() => router.back()} />
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div>
          <div style={{
            fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 15,
            color: t.creamDim, lineHeight: 1.5, marginBottom: 6,
          }}>
            export your data from <span style={{ color: t.cream }}>letterboxd.com/settings/data</span>,
            unzip it, then drop the CSVs here.
          </div>
        </div>

        {topMsg && (
          <div style={{
            padding: '10px 12px', border: `1px solid ${t.danger}`, color: t.danger,
            fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}>{topMsg}</div>
        )}

        <FileSlot
          t={t}
          label="diary.csv (required)"
          subtitle={diary ? `${diary.length} rows loaded` : 'every watched film with date + rating'}
          loaded={!!diary}
          onFile={onDiary}
          disabled={phase !== 'idle'}
        />

        <FileSlot
          t={t}
          label="reviews.csv (optional)"
          subtitle={diary?.some(r => r.review)
            ? `${diary.filter(r => r.review).length} reviews matched`
            : 'review text imported as note'}
          loaded={!!diary?.some(r => r.review)}
          onFile={onReviews}
          disabled={!diary || phase !== 'idle'}
        />

        {phase === 'idle' && diary && (
          <button onClick={startMatching} style={{
            padding: '14px 0', background: t.cream, color: t.bg,
            border: 'none', cursor: 'pointer',
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2.5,
            textTransform: 'uppercase',
          }}>match {diary.length} on tmdb →</button>
        )}

        {phase === 'matching' && (
          <div style={{
            padding: '14px 0', textAlign: 'center',
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: t.creamDim,
          }}>matching… {progress.done} / {progress.total}</div>
        )}

        {(phase === 'preview' || phase === 'importing' || phase === 'done') && matches.length > 0 && (
          <Preview t={t} matches={matches} />
        )}

        {phase === 'preview' && (
          <SubmitBar t={t} matches={matches} onSubmit={submit} />
        )}

        {phase === 'importing' && (
          <div style={{
            padding: '14px 0', textAlign: 'center',
            fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: t.creamDim,
          }}>importing…</div>
        )}

        {phase === 'done' && result && (
          <div style={{
            padding: 14, border: `1px solid ${result.error ? t.danger : t.signal}`,
            background: t.surface,
          }}>
            {result.error ? (
              <div style={{
                fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.4,
                textTransform: 'uppercase', color: t.danger,
              }}>error · {result.error}</div>
            ) : (
              <>
                <div style={{
                  fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
                  textTransform: 'uppercase', color: t.signal, marginBottom: 6,
                }}>✓ done</div>
                <div style={{
                  fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
                  color: t.creamDim, lineHeight: 1.4,
                }}>
                  {result.imported} imported · {result.skipped} skipped (already in your log).
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ t, onBack }: { t: Theme; onBack: () => void }) {
  return (
    <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${t.line}` }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
        textTransform: 'uppercase', color: t.muted, marginBottom: 16,
      }}>← back</button>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.8,
        textTransform: 'uppercase', color: t.muted, marginBottom: 12,
      }}>§ migrate</div>
      <div style={{
        fontFamily: LumiereType.display, fontSize: 44, lineHeight: 0.95,
        color: t.cream, letterSpacing: -1.2,
      }}>letterboxd<br/><span style={{ fontStyle: 'italic', color: t.signal }}>import</span></div>
    </div>
  );
}

function FileSlot({
  t, label, subtitle, loaded, onFile, disabled,
}: {
  t: Theme;
  label: string;
  subtitle: string;
  loaded: boolean;
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  return (
    <div style={{
      padding: 14, border: `1px ${loaded ? 'solid' : 'dashed'} ${loaded ? t.signal : t.line}`,
      background: t.surface, opacity: disabled && !loaded ? 0.5 : 1,
    }}>
      <div style={{
        fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
        textTransform: 'uppercase', color: loaded ? t.signal : t.muted, marginBottom: 6,
      }}>{loaded ? '✓ ' : ''}{label}</div>
      <div style={{
        fontFamily: LumiereType.body, fontStyle: 'italic', fontSize: 14,
        color: t.creamDim, marginBottom: 10,
      }}>{subtitle}</div>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        style={{
          padding: '8px 14px', cursor: disabled ? 'default' : 'pointer',
          background: 'transparent', border: `1px solid ${t.line}`, color: t.creamDim,
          fontFamily: LumiereType.mono, fontSize: 9, letterSpacing: 1.6,
          textTransform: 'uppercase', opacity: disabled ? 0.6 : 1,
        }}
      >{loaded ? 'replace' : 'choose file'}</button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={e => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onFile(f);
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
}

function Preview({ t, matches }: { t: Theme; matches: Match[] }) {
  const matched = matches.filter(m => m.status === 'matched').length;
  const unmatched = matches.length - matched;
  return (
    <div>
      <Eyebrow num="✓" label={`${matched} matched · ${unmatched} skipped`} t={t} style={{ marginBottom: 14 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
        {matches.map((m, i) => (
          <Row key={`${i}-${m.row.uri}`} t={t} m={m} />
        ))}
      </div>
    </div>
  );
}

function Row({ t, m }: { t: Theme; m: Match }) {
  const ok = m.status === 'matched';
  const dim = !ok;
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'center',
      padding: '8px 10px', border: `1px solid ${t.lineSoft}`, opacity: dim ? 0.55 : 1,
    }}>
      {ok && m.film
        ? <div style={{ width: 36, flexShrink: 0 }}><Poster film={m.film} size="sm" t={t} /></div>
        : <div style={{
            width: 36, height: 52, background: t.surfaceHi, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: LumiereType.mono, fontSize: 14, color: t.muted,
          }}>·</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: LumiereType.body, fontSize: 14, color: t.cream,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{m.row.name} <span style={{ color: t.muted }}>({m.row.year})</span></div>
        <div style={{
          fontFamily: LumiereType.mono, fontSize: 8, letterSpacing: 1.2,
          textTransform: 'uppercase', color: t.muted, marginTop: 2,
        }}>
          {m.row.watchedDate || m.row.date}
          {m.row.rating && ` · ${m.row.rating}★`}
          {m.row.review && ' · review'}
          {m.status === 'unmatched' && ' · no tmdb match'}
          {m.status === 'error' && ` · ${m.error}`}
          {m.status === 'pending' && ' · matching…'}
        </div>
      </div>
    </div>
  );
}

function SubmitBar({
  t, matches, onSubmit,
}: {
  t: Theme;
  matches: Match[];
  onSubmit: () => void;
}) {
  const n = matches.filter(m => m.status === 'matched').length;
  return (
    <button onClick={onSubmit} disabled={n === 0} style={{
      padding: '14px 0', background: t.cream, color: t.bg,
      border: 'none', cursor: n === 0 ? 'default' : 'pointer',
      opacity: n === 0 ? 0.4 : 1,
      fontFamily: LumiereType.mono, fontSize: 10, letterSpacing: 2.5,
      textTransform: 'uppercase',
    }}>import {n} entries (private)</button>
  );
}

// ─────────────────────────────────────────────────────────────────────
// helpers

function parseCSV(text: string): Record<string, string>[] {
  const lines = splitCSVLines(text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
  if (lines.length === 0) return [];
  const headers = parseCSVRow(lines[0]).map(h => h.trim());
  return lines.slice(1).filter(l => l.trim().length > 0).map(line => {
    const fields = parseCSVRow(line);
    const out: Record<string, string> = {};
    headers.forEach((h, i) => { out[h] = (fields[i] ?? '').trim(); });
    return out;
  });
}

// CSV-aware line splitter (handles quoted multi-line fields)
function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { cur += '""'; i += 1; continue; }
      inQuotes = !inQuotes;
      cur += ch;
      continue;
    }
    if (ch === '\n' && !inQuotes) {
      lines.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

function parseCSVRow(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseDiaryCSV(text: string): DiaryRow[] {
  const rows = parseCSV(text);
  if (rows.length === 0) throw new Error('empty diary.csv');
  const required = ['Name', 'Year'];
  for (const k of required) {
    if (!(k in rows[0])) throw new Error(`diary.csv missing column: ${k}`);
  }
  return rows.map(r => ({
    date: r['Date'] ?? '',
    watchedDate: r['Watched Date'] ?? '',
    name: r['Name'] ?? '',
    year: r['Year'] ?? '',
    uri: r['Letterboxd URI'] ?? '',
    rating: r['Rating'] ?? '',
    rewatch: r['Rewatch'] ?? '',
  })).filter(r => r.name);
}

function parseReviewsCSV(text: string): Map<string, string> {
  const rows = parseCSV(text);
  const out = new Map<string, string>();
  for (const r of rows) {
    const uri = r['Letterboxd URI'];
    const review = r['Review'];
    if (uri && review) out.set(uri, review);
  }
  return out;
}

async function matchFilm(row: DiaryRow): Promise<Film | null> {
  const results = await searchFilms(row.name);
  const films = results.filter(f => f.kind === 'film');
  if (films.length === 0) return null;
  const wantYear = +row.year || 0;
  if (!wantYear) return films[0];
  // exact year match wins
  const exact = films.find(f => f.year === wantYear);
  if (exact) return exact;
  // off-by-one is fine (release vs. premiere drift)
  const close = films.find(f => Math.abs((f.year || 0) - wantYear) <= 1);
  return close ?? films[0];
}

function toIso(date: string): string {
  // Letterboxd dates are already YYYY-MM-DD; treat as noon UTC so timezones don't shift the day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return `${date}T12:00:00.000Z`;
  // fallback: try Date parse
  const d = new Date(date);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
