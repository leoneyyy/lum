'use client';
import React from 'react';
import type { Film, LogEntry } from './types';
import { getFilmsBatch, FILMS_BATCH_MAX } from './api';

// One film cache for the whole app. Before this every hook instance fetched
// each of its films separately, on every page visit: a few hundred imported
// entries meant hundreds of requests per page, which ran into the per-user
// rate limit and left home and orbit without titles or posters.
//
// Now: each film is fetched once (in batches of up to 50), shared by every
// component, and kept in localStorage so reopening the app needs no requests.

const STORE_KEY = 'lumiere:films:v1';
const MAX_STORED = 1500;                       // most recently used films kept
const STALE_MS = 7 * 24 * 3600 * 1000;         // refetch stored films after a week
const RETRY_FAILED_MS = 30_000;                // don't hammer ids that just failed
const FLUSH_DELAY_MS = 15;                     // gather requests from one render pass

type Stored = Record<string, { f: Film; t: number }>;

const films = new Map<string, Film>();
const fetchedAt = new Map<string, number>();
const inFlight = new Set<string>();
const failedAt = new Map<string, number>();
const queue = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let loaded = false;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  for (const cb of listeners) cb();
}

function loadStored() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    for (const [id, { f, t }] of Object.entries(JSON.parse(raw) as Stored)) {
      films.set(id, f);
      fetchedAt.set(id, t);
    }
  } catch {
    // corrupt or blocked storage: start empty
  }
}

function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const newest = [...fetchedAt.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_STORED);
    const out: Stored = {};
    for (const [id, t] of newest) {
      const f = films.get(id);
      if (f) out[id] = { f, t };
    }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(out)); } catch {
      // storage full: the in-memory cache still works for this session
    }
  }, 1000);
}

async function flush() {
  flushTimer = null;
  const ids = [...queue];
  queue.clear();
  for (let i = 0; i < ids.length; i += FILMS_BATCH_MAX) {
    const chunk = ids.slice(i, i + FILMS_BATCH_MAX);
    const got = await getFilmsBatch(chunk).catch(() => null);
    const now = Date.now();
    for (const id of chunk) {
      inFlight.delete(id);
      const f = got?.[id];
      if (f) {
        films.set(id, f);
        fetchedAt.set(id, now);
        failedAt.delete(id);
      } else {
        failedAt.set(id, now);
      }
    }
    notify();
    schedulePersist();
  }
}

function request(ids: readonly string[]) {
  loadStored();
  const now = Date.now();
  for (const id of ids) {
    if (!id || inFlight.has(id)) continue;
    const fresh = films.has(id) && now - (fetchedAt.get(id) ?? 0) < STALE_MS;
    const recentlyFailed = now - (failedAt.get(id) ?? 0) < RETRY_FAILED_MS;
    if (fresh || recentlyFailed) continue;
    inFlight.add(id);
    queue.add(id);
  }
  if (queue.size > 0 && !flushTimer) flushTimer = setTimeout(() => void flush(), FLUSH_DELAY_MS);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function snapshot() {
  loadStored();
  return version;
}

export function useFilmsByIds(rawIds: readonly string[]): Record<string, Film> {
  const key = React.useMemo(() => Array.from(new Set(rawIds)).sort().join('|'), [rawIds]);
  const v = React.useSyncExternalStore(subscribe, snapshot, () => -1);

  React.useEffect(() => {
    request(key.split('|').filter(Boolean));
  }, [key]);

  return React.useMemo(() => {
    const out: Record<string, Film> = {};
    if (v < 0) return out;  // server render: nothing cached there
    for (const id of key.split('|')) {
      const f = id && films.get(id);
      if (f) out[id] = f;
    }
    return out;
  }, [key, v]);
}

export function useFilmsForEntries(entries: LogEntry[]): Record<string, Film> {
  return useFilmsByIds(entries.map(e => e.filmId));
}
