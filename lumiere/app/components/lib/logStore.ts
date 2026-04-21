'use client';
import React from 'react';
import type { LogEntry, RatingMap } from './types';
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
};

let mode: Mode = 'local';
let userId: string | null = null;
let cache: LogEntry[] = [];
let initialized = false;
let realtimeUnsub: (() => void) | null = null;
const listeners = new Set<() => void>();

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
  };
}

async function fetchRemote(): Promise<LogEntry[]> {
  const sb = getSupabase();
  if (!sb || !userId) return [];
  const { data, error } = await sb
    .from('log_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[lumiere] log fetch failed', error.message);
    return [];
  }
  return (data as Row[]).map(rowToEntry);
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
      async () => {
        cache = await fetchRemote();
        notify();
      },
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

  if (mode === 'remote') {
    void (async () => {
      cache = await fetchRemote();
      notify();
      setupRealtime();
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

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {}
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function saveEntry(input: {
  filmId: string; cry: number; ratings: RatingMap; note?: string;
}): LogEntry {
  const entry: LogEntry = {
    id: newId(),
    userId: userId ?? 'local',
    filmId: input.filmId,
    cry: input.cry,
    ratings: input.ratings,
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  cache = [entry, ...(cache)];
  notify();

  if (mode === 'remote') {
    const sb = getSupabase();
    if (sb && userId) {
      void sb.from('log_entries').insert({
        id: entry.id,
        user_id: userId,
        film_id: entry.filmId,
        cry: entry.cry,
        ratings: entry.ratings,
        note: entry.note ?? null,
        created_at: entry.createdAt,
      }).then(({ error }) => {
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
