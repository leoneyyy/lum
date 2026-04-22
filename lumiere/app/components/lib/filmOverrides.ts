'use client';
import React from 'react';
import type { Film } from './types';

export interface FilmOverride {
  posterUrl?: string;
  backdropUrl?: string;
}

type Store = Record<string, FilmOverride>;

const KEY = 'lumiere:film-overrides';
const EMPTY: Store = {};

let cache: Store = {};
let initialized = false;
const listeners = new Set<() => void>();

function ensureInit() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Store) : {};
  } catch { cache = {}; }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
}

function notify() { for (const cb of listeners) cb(); }

function snapshot(): Store { ensureInit(); return cache; }
function serverSnapshot(): Store { return EMPTY; }

function subscribe(cb: () => void): () => void {
  ensureInit();
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      try {
        cache = e.newValue ? (JSON.parse(e.newValue) as Store) : {};
      } catch { cache = {}; }
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useFilmOverrides(): Store {
  return React.useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function useFilmOverride(filmId: string): FilmOverride {
  const all = useFilmOverrides();
  return all[filmId] || EMPTY;
}

export function setFilmOverride(filmId: string, patch: FilmOverride) {
  const merged = { ...(cache[filmId] || {}), ...patch };
  (Object.keys(merged) as (keyof FilmOverride)[]).forEach(k => {
    if (merged[k] == null) delete merged[k];
  });
  const next: Store = { ...cache };
  if (Object.keys(merged).length === 0) delete next[filmId];
  else next[filmId] = merged;
  cache = next;
  persist();
  notify();
}

export function clearFilmOverride(filmId: string, key?: keyof FilmOverride) {
  if (!cache[filmId]) return;
  if (!key) {
    const next: Store = { ...cache };
    delete next[filmId];
    cache = next;
  } else {
    setFilmOverride(filmId, { [key]: undefined });
    return;
  }
  persist();
  notify();
}

export function applyOverride(film: Film, override: FilmOverride): Film {
  if (!override.posterUrl && !override.backdropUrl) return film;
  return {
    ...film,
    posterUrl: override.posterUrl ?? film.posterUrl,
    backdropUrl: override.backdropUrl ?? film.backdropUrl,
  };
}
