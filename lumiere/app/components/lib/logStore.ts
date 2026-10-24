'use client';
import React from 'react';
import type { LogEntry, RatingMap, Visibility } from './types';
import { getSupabase } from './supabase';

const LOCAL_KEY = 'lumiere:log';

type Mode = 'local' | 'remote';
type Row = {
  id: string;
  user_id: string;
  film_id: string;
  cry: number;
  ratings: RatingMap | null;
  note: string | null;
  created_at: string;
  visibility?: Visibility | null;
};

let mode: Mode = 'local';
let userId: string | null = null;
let cache: LogEntry[] = [];
let initialized = false;
let realtimeUnsub: (() => void) | null = null;
const listeners = new Set<() => void>();
// Bumped on every user switch; a fetch that resolves after a newer switch
// is stale and must not overwrite the cache.
let loadGen = 0;
// Optimistic inserts the server hasn't confirmed yet. Kept across refetches
// so a fetch that lands mid-insert doesn't make a fresh entry vanish.
const pending = new Map<string, LogEntry>();

const notify = () => { for (const cb of listeners) cb(); };

function ensureInit() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  cache = readLocal();
}

function readLocal(): LogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch { return []; }
}

function writeLocal(list: LogEntry[]) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch {}
}

function rowToEntry(r: Row): LogEntry {
  return {
    id: r.id,
    userId: r.user_id,
    filmId: r.film_id,
    cry: r.cry,
    ratings: (r.ratings ?? {}) as RatingMap,
    note: r.note ?? undefined,
    createdAt: r.created_at,
    visibility: (r.visibility ?? 'private') as Visibility,
  };
}

async function fetchRemote(): Promise<LogEntry[] | null> {
  const sb = getSupabase();
  if (!sb || !userId) return [];
  const { data, error } = await sb
    .from('log_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[lumiere] log fetch failed', error.message);
    return null;  // keep what we have rather than blanking the log
  }
  return (data as Row[]).map(rowToEntry);
}

// Server rows plus any optimistic inserts still in flight, newest first.
function withPending(rows: LogEntry[]): LogEntry[] {
  if (pending.size === 0) return rows;
  const have = new Set(rows.map(r => r.id));
  const extra = [...pending.values()].filter(e => !have.has(e.id) && e.userId === userId);
  return [...extra, ...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Refetch for the current user; ignored if the user changed meanwhile.
async function refresh(): Promise<void> {
  const gen = loadGen;
  const rows = await fetchRemote();
  if (gen !== loadGen || rows === null) return;
  cache = withPending(rows);
  notify();
}

// Entries logged in local mode (before sign-in finished, or before sync was
// set up) live only in localStorage. Move them into the account once it's
// ready, so switching to remote doesn't silently drop them.
async function adoptLocalEntries(gen: number): Promise<void> {
  const local = readLocal();
  const sb = getSupabase();
  if (local.length === 0 || !sb || !userId) return;
  const owner = userId;
  const rows = local.map(e => ({
    id: isUuid(e.id) ? e.id : newId(),
    user_id: owner,
    film_id: e.filmId,
    cry: e.cry,
    ratings: e.ratings ?? {},
    note: e.note ?? null,
    created_at: e.createdAt,
    visibility: e.visibility ?? 'private',
  }));
  const { error } = await sb.from('log_entries').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  if (error) {
    console.error('[lumiere] moving local log into account failed', error.message);
    return;  // leave localStorage as is; we'll try again next time
  }
  try { localStorage.removeItem(LOCAL_KEY); } catch {}
  if (gen === loadGen) await refresh();
}

function teardownRealtime() {
  if (realtimeUnsub) { realtimeUnsub(); realtimeUnsub = null; }
}

function setupRealtime() {
  const sb = getSupabase();
  if (!sb || !userId) return;
  const channel = sb
    .channel(`log:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'log_entries', filter: `user_id=eq.${userId}` },
      () => { void refresh(); },
    )
    .subscribe();
  realtimeUnsub = () => { void sb.removeChannel(channel); };
}

export function setBackendUser(nextUserId: string | null) {
  const sb = getSupabase();
  const nextMode: Mode = sb && nextUserId ? 'remote' : 'local';
  if (nextUserId === userId && nextMode === mode) return;

  teardownRealtime();
  userId = nextUserId;
  mode = nextMode;
  const gen = ++loadGen;

  if (mode === 'remote') {
    // don't show another user's (or the local) log while this one loads
    cache = [];
    notify();
    void (async () => {
      await refresh();
      if (gen !== loadGen) return;
      setupRealtime();
      await adoptLocalEntries(gen);
    })();
  } else {
    cache = readLocal();
    notify();
  }
}

const EMPTY: LogEntry[] = [];
function snapshot(): LogEntry[] { ensureInit(); return cache; }
function serverSnapshot(): LogEntry[] { return EMPTY; }

function subscribe(cb: () => void): () => void {
  ensureInit();
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (mode === 'local' && e.key === LOCAL_KEY) {
      cache = readLocal();
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useLog(): LogEntry[] {
  return React.useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function useFilmEntries(filmId: string): LogEntry[] {
  const all = useLog();
  return React.useMemo(
    () => all.filter(e => e.filmId === filmId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all, filmId],
  );
}

// log_entries.id is a uuid column. crypto.randomUUID only exists in secure
// contexts (https/localhost), so e.g. a phone on the LAN dev server needs
// the getRandomValues fallback; anything else would fail the insert.
function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {}
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;  // version 4
  b[8] = (b[8] & 0x3f) | 0x80;  // RFC 4122 variant
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function saveEntry(input: {
  filmId: string; cry: number; ratings: RatingMap; note?: string; visibility?: Visibility;
}): LogEntry {
  const entry: LogEntry = {
    id: newId(),
    userId: userId ?? 'local',
    filmId: input.filmId,
    cry: input.cry,
    ratings: input.ratings,
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
    visibility: input.visibility ?? 'private',
  };
  cache = [entry, ...(cache)];
  notify();

  if (mode === 'remote') {
    const sb = getSupabase();
    if (sb && userId) {
      pending.set(entry.id, entry);
      void sb.from('log_entries').insert({
        id: entry.id,
        user_id: userId,
        film_id: entry.filmId,
        cry: entry.cry,
        ratings: entry.ratings,
        note: entry.note ?? null,
        created_at: entry.createdAt,
        visibility: entry.visibility,
      }).then(({ error }) => {
        pending.delete(entry.id);
        if (error) {
          console.error('[lumiere] log insert failed', error.message);
          cache = (cache).filter(e => e.id !== entry.id);
          notify();
        }
      });
    }
  } else {
    writeLocal(cache);
  }

  return entry;
}

export function setEntryVisibility(id: string, visibility: Visibility): void {
  updateEntry(id, { visibility });
}

export interface ImportItem {
  filmId: string;
  cry: number;
  ratings?: RatingMap;
  note?: string;
  visibility?: Visibility;
  createdAt: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  error?: string;
}

const dayKey = (iso: string) => iso.slice(0, 10);

export async function importEntries(items: ImportItem[]): Promise<ImportResult> {
  if (items.length === 0) return { imported: 0, skipped: 0 };

  const seen = new Set<string>();
  for (const e of cache) seen.add(`${e.filmId}|${dayKey(e.createdAt)}`);

  const fresh: LogEntry[] = [];
  let skipped = 0;
  for (const it of items) {
    const key = `${it.filmId}|${dayKey(it.createdAt)}`;
    if (seen.has(key)) { skipped += 1; continue; }
    seen.add(key);
    fresh.push({
      id: newId(),
      userId: userId ?? 'local',
      filmId: it.filmId,
      cry: Math.max(0, Math.min(100, Math.round(it.cry))),
      ratings: it.ratings ?? {},
      note: it.note?.trim() || undefined,
      createdAt: it.createdAt,
      visibility: it.visibility ?? 'private',
    });
  }

  if (fresh.length === 0) return { imported: 0, skipped };

  if (mode === 'remote') {
    const sb = getSupabase();
    if (!sb || !userId) return { imported: 0, skipped, error: 'not signed in' };
    const rows = fresh.map(e => ({
      id: e.id,
      user_id: userId,
      film_id: e.filmId,
      cry: e.cry,
      ratings: e.ratings,
      note: e.note ?? null,
      created_at: e.createdAt,
      visibility: e.visibility,
    }));
    const { error } = await sb.from('log_entries').insert(rows);
    if (error) return { imported: 0, skipped, error: error.message };
  }

  cache = [...fresh, ...cache].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  notify();
  if (mode === 'local') writeLocal(cache);

  return { imported: fresh.length, skipped };
}

export function updateEntry(
  id: string,
  patch: { cry?: number; ratings?: RatingMap; note?: string | null; visibility?: Visibility },
): void {
  const prev = cache;
  const target = prev.find(e => e.id === id);
  if (!target) return;

  const next: LogEntry = {
    ...target,
    cry: patch.cry ?? target.cry,
    ratings: patch.ratings ?? target.ratings,
    note: 'note' in patch
      ? (patch.note?.toString().trim() || undefined)
      : target.note,
    visibility: patch.visibility ?? target.visibility,
  };

  cache = prev.map(e => e.id === id ? next : e);
  notify();

  if (mode === 'remote') {
    const sb = getSupabase();
    if (sb && userId) {
      const update: Record<string, unknown> = {};
      if (patch.cry !== undefined) update.cry = next.cry;
      if (patch.ratings !== undefined) update.ratings = next.ratings;
      if ('note' in patch) update.note = next.note ?? null;
      if (patch.visibility !== undefined) update.visibility = next.visibility;
      if (Object.keys(update).length === 0) return;
      void sb.from('log_entries').update(update).eq('id', id).then(({ error }) => {
        if (error) {
          console.error('[lumiere] entry update failed', error.message);
          cache = cache.map(e => e.id === id ? target : e);
          notify();
        }
      });
    }
  } else {
    writeLocal(cache);
  }
}

export function deleteEntry(id: string): void {
  const prev = cache;
  const victim = prev.find(e => e.id === id);
  cache = prev.filter(e => e.id !== id);
  notify();

  if (mode === 'remote') {
    const sb = getSupabase();
    if (sb && userId) {
      void sb.from('log_entries').delete().eq('id', id).then(({ error }) => {
        if (error) {
          console.error('[lumiere] log delete failed', error.message);
          if (victim) {
            cache = [victim, ...(cache)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            notify();
          }
        }
      });
    }
  } else {
    writeLocal(cache);
  }
}
