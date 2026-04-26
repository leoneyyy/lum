'use client';
import React from 'react';
import type { Film } from './types';
import { getSupabase } from './supabase';

export interface FilmOverride {
  posterUrl?: string;
  backdropUrl?: string;
}

type Store = Record<string, FilmOverride>;

const LEGACY_KEY = 'lumiere:film-overrides';
const EMPTY: Store = {};

// ── own overrides (per-user, shared via supabase) ─────────────────

let myUserId: string | null = null;
let myCache: Store = {};
let myInitialized = false;
const myListeners = new Set<() => void>();
const notifyMine = () => { for (const cb of myListeners) cb(); };

type Row = { film_id: string; poster_url: string | null; backdrop_url: string | null };

function rowsToStore(rows: Row[] | null | undefined): Store {
  const out: Store = {};
  for (const r of rows ?? []) {
    const o: FilmOverride = {};
    if (r.poster_url) o.posterUrl = r.poster_url;
    if (r.backdrop_url) o.backdropUrl = r.backdrop_url;
    if (o.posterUrl || o.backdropUrl) out[r.film_id] = o;
  }
  return out;
}

async function migrateLegacy(userId: string): Promise<Store> {
  const sb = getSupabase();
  if (!sb || typeof window === 'undefined') return {};
  let local: Store = {};
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    local = raw ? (JSON.parse(raw) as Store) : {};
  } catch { return {}; }
  const inserts: Array<{ user_id: string; film_id: string; poster_url: string | null; backdrop_url: string | null }> = [];
  for (const [filmId, ov] of Object.entries(local)) {
    if (!ov.posterUrl && !ov.backdropUrl) continue;
    inserts.push({
      user_id: userId,
      film_id: filmId,
      poster_url: ov.posterUrl ?? null,
      backdrop_url: ov.backdropUrl ?? null,
    });
  }
  if (inserts.length === 0) return {};
  const { error } = await sb.from('film_overrides').upsert(inserts, { onConflict: 'user_id,film_id' });
  if (error) {
    console.error('[lumiere] override migration failed', error.message);
    return {};
  }
  try { localStorage.removeItem(LEGACY_KEY); } catch {}
  return local;
}

async function loadMine() {
  const sb = getSupabase();
  if (!sb || !myUserId) return;
  const { data, error } = await sb
    .from('film_overrides')
    .select('film_id, poster_url, backdrop_url')
    .eq('user_id', myUserId);
  if (error) {
    console.error('[lumiere] overrides load failed', error.message);
    myInitialized = true;
    notifyMine();
    return;
  }
  let next = rowsToStore(data as Row[] | null);
  if (Object.keys(next).length === 0) {
    const migrated = await migrateLegacy(myUserId);
    if (Object.keys(migrated).length > 0) next = migrated;
  }
  myCache = next;
  myInitialized = true;
  notifyMine();
}

export function setOverridesUser(id: string | null) {
  if (myUserId === id) return;
  myUserId = id;
  myCache = {};
  myInitialized = false;
  notifyMine();
  if (id) void loadMine();
}

function useMineSubscribe(): Store {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const cb = () => setTick(t => t + 1);
    myListeners.add(cb);
    return () => { myListeners.delete(cb); };
  }, []);
  return myInitialized ? myCache : EMPTY;
}

export function useFilmOverrides(): Store {
  return useMineSubscribe();
}

export function useFilmOverride(filmId: string): FilmOverride {
  const all = useMineSubscribe();
  return all[filmId] || EMPTY;
}

export async function setFilmOverride(filmId: string, patch: FilmOverride): Promise<void> {
  const sb = getSupabase();
  if (!sb || !myUserId) return;

  const merged: FilmOverride = { ...(myCache[filmId] || {}), ...patch };
  if (!merged.posterUrl) delete merged.posterUrl;
  if (!merged.backdropUrl) delete merged.backdropUrl;
  const isEmpty = !merged.posterUrl && !merged.backdropUrl;

  const prev = myCache;
  if (isEmpty) {
    const next = { ...myCache };
    delete next[filmId];
    myCache = next;
  } else {
    myCache = { ...myCache, [filmId]: merged };
  }
  notifyMine();

  if (isEmpty) {
    const { error } = await sb
      .from('film_overrides')
      .delete()
      .eq('user_id', myUserId)
      .eq('film_id', filmId);
    if (error) {
      myCache = prev;
      notifyMine();
      console.error('[lumiere] override delete failed', error.message);
    }
  } else {
    const { error } = await sb
      .from('film_overrides')
      .upsert({
        user_id: myUserId,
        film_id: filmId,
        poster_url: merged.posterUrl ?? null,
        backdrop_url: merged.backdropUrl ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,film_id' });
    if (error) {
      myCache = prev;
      notifyMine();
      console.error('[lumiere] override write failed', error.message);
    }
  }
}

export function clearFilmOverride(filmId: string, key?: keyof FilmOverride): void {
  if (!myCache[filmId]) return;
  if (!key) {
    void setFilmOverride(filmId, { posterUrl: undefined, backdropUrl: undefined });
  } else {
    void setFilmOverride(filmId, { [key]: undefined });
  }
}

// ── another user's overrides (read-only, lazy fetched) ────────────

const otherCache = new Map<string, Store>();
const otherInflight = new Set<string>();
const otherListeners = new Set<() => void>();
const notifyOthers = () => { for (const cb of otherListeners) cb(); };

export function useFilmOverridesFor(userId: string): Store {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const cb = () => setTick(t => t + 1);
    otherListeners.add(cb);
    return () => { otherListeners.delete(cb); };
  }, []);

  React.useEffect(() => {
    if (!userId) return;
    if (otherCache.has(userId) || otherInflight.has(userId)) return;
    const sb = getSupabase();
    if (!sb) return;
    otherInflight.add(userId);
    void (async () => {
      try {
        const { data, error } = await sb
          .from('film_overrides')
          .select('film_id, poster_url, backdrop_url')
          .eq('user_id', userId);
        if (error) {
          console.error('[lumiere] overrides for', userId, error.message);
          otherCache.set(userId, {});
        } else {
          otherCache.set(userId, rowsToStore(data as Row[] | null));
        }
      } finally {
        otherInflight.delete(userId);
        notifyOthers();
      }
    })();
  }, [userId]);

  return otherCache.get(userId) ?? EMPTY;
}

// ── pure helper ───────────────────────────────────────────────────

export function applyOverride(film: Film, override: FilmOverride): Film {
  if (!override.posterUrl && !override.backdropUrl) return film;
  return {
    ...film,
    posterUrl: override.posterUrl ?? film.posterUrl,
    backdropUrl: override.backdropUrl ?? film.backdropUrl,
  };
}
