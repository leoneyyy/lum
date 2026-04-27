'use client';
import React from 'react';
import { getSupabase } from './supabase';

type LoadState = 'idle' | 'loading' | 'loaded';

let myUserId: string | null = null;
let watched: Set<string> = new Set();
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
    .from('watched')
    .select('film_id')
    .eq('user_id', myUserId);
  if (error) {
    console.error('[lumiere] watched fetch failed', error.message);
    state = 'loaded';
    watched = new Set();
    notify();
    return;
  }
  watched = new Set((data ?? []).map((r: { film_id: string }) => r.film_id));
  state = 'loaded';
  notify();
}

export function setWatchedUser(userId: string | null) {
  if (myUserId === userId) return;
  myUserId = userId;
  watched = new Set();
  state = 'idle';
  notify();
  if (userId) void load();
}

const EMPTY_IDS: readonly string[] = [];
const EMPTY_VIEW = { ids: EMPTY_IDS, state: 'idle' as const };

function snapshot(): { ids: readonly string[]; state: LoadState } {
  if (cachedVersion !== version) {
    cachedVersion = version;
    cachedSnapshot = {
      ids: Array.from(watched),
      state,
    };
  }
  return cachedSnapshot;
}
function serverSnapshot() { return EMPTY_VIEW; }
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useWatched(): { ids: readonly string[]; state: LoadState } {
  return React.useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function useIsWatched(filmId: string): boolean {
  const { ids } = useWatched();
  return ids.includes(filmId);
}

export async function markWatched(filmId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !myUserId) return 'not signed in';
  if (watched.has(filmId)) return null;
  watched = new Set(watched);
  watched.add(filmId);
  notify();
  const { error } = await sb.from('watched').insert({
    user_id: myUserId,
    film_id: filmId,
  });
  if (error && error.code !== '23505') {
    console.error('[lumiere] mark watched failed', error.message);
    watched = new Set(watched);
    watched.delete(filmId);
    notify();
    return error.message;
  }
  return null;
}

export async function unmarkWatched(filmId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !myUserId) return 'not signed in';
  if (!watched.has(filmId)) return null;
  watched = new Set(watched);
  watched.delete(filmId);
  notify();
  const { error } = await sb
    .from('watched')
    .delete()
    .eq('user_id', myUserId)
    .eq('film_id', filmId);
  if (error) {
    console.error('[lumiere] unmark watched failed', error.message);
    watched = new Set(watched);
    watched.add(filmId);
    notify();
    return error.message;
  }
  return null;
}

// bulk add — used by the letterboxd importer so each diary row also counts as watched.
export async function markManyWatched(filmIds: readonly string[]): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !myUserId) return 'not signed in';
  const fresh = filmIds.filter(id => !watched.has(id));
  if (fresh.length === 0) return null;
  const next = new Set(watched);
  for (const id of fresh) next.add(id);
  watched = next;
  notify();
  const rows = fresh.map(id => ({ user_id: myUserId, film_id: id }));
  const { error } = await sb.from('watched').upsert(rows, { onConflict: 'user_id,film_id' });
  if (error) {
    console.error('[lumiere] mark many watched failed', error.message);
    const rollback = new Set(watched);
    for (const id of fresh) rollback.delete(id);
    watched = rollback;
    notify();
    return error.message;
  }
  return null;
}
