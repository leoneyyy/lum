'use client';
import React from 'react';
import { getSupabase } from './supabase';

type LoadState = 'idle' | 'loading' | 'loaded';

let myUserId: string | null = null;
let list: Set<string> = new Set();
let state: LoadState = 'idle';
let cachedSnapshot: { ids: readonly string[]; state: LoadState } = { ids: [], state: 'idle' };
let cachedVersion = -1;
let version = 0;
const listeners = new Set<() => void>();
const notify = () => { version++; for (const cb of listeners) cb(); };

async function load() {
  const sb = getSupabase();
  if (!sb || !myUserId) return;
  state = 'loading';
  notify();
  const { data, error } = await sb
    .from('watchlist')
    .select('film_id')
    .eq('user_id', myUserId);
  if (error) {
    console.error('[lumiere] watchlist fetch failed', error.message);
    state = 'loaded';
    list = new Set();
    notify();
    return;
  }
  list = new Set((data ?? []).map((r: { film_id: string }) => r.film_id));
  state = 'loaded';
  notify();
}

export function setWatchlistUser(userId: string | null) {
  if (myUserId === userId) return;
  myUserId = userId;
  list = new Set();
  state = 'idle';
  notify();
  if (userId) void load();
}

const EMPTY_VIEW = { ids: [] as readonly string[], state: 'idle' as const };

function snapshot(): { ids: readonly string[]; state: LoadState } {
  if (cachedVersion !== version) {
    cachedVersion = version;
    cachedSnapshot = { ids: Array.from(list), state };
  }
  return cachedSnapshot;
}
function serverSnapshot() { return EMPTY_VIEW; }
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useWatchlist(): { ids: readonly string[]; state: LoadState } {
  return React.useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function useIsOnWatchlist(filmId: string): boolean {
  const { ids } = useWatchlist();
  return ids.includes(filmId);
}

export async function addToWatchlist(filmId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !myUserId) return 'not signed in';
  if (list.has(filmId)) return null;
  list = new Set(list);
  list.add(filmId);
  notify();
  const { error } = await sb.from('watchlist').insert({
    user_id: myUserId,
    film_id: filmId,
  });
  if (error && error.code !== '23505') {
    console.error('[lumiere] watchlist add failed', error.message);
    list = new Set(list);
    list.delete(filmId);
    notify();
    return error.message;
  }
  return null;
}

export async function removeFromWatchlist(filmId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !myUserId) return 'not signed in';
  if (!list.has(filmId)) return null;
  list = new Set(list);
  list.delete(filmId);
  notify();
  const { error } = await sb
    .from('watchlist')
    .delete()
    .eq('user_id', myUserId)
    .eq('film_id', filmId);
  if (error) {
    console.error('[lumiere] watchlist remove failed', error.message);
    list = new Set(list);
    list.add(filmId);
    notify();
    return error.message;
  }
  return null;
}
