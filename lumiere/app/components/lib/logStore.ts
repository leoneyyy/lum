'use client';
import React from 'react';
import type { LogEntry, RatingMap } from './types';

const KEY = 'lumiere:log';

function read(): LogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch { return []; }
}

function write(list: LogEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

const EMPTY: LogEntry[] = [];
let cache: LogEntry[] | null = null;
const listeners = new Set<() => void>();

function snapshot(): LogEntry[] {
  if (cache === null) cache = read();
  return cache;
}

function serverSnapshot(): LogEntry[] {
  return EMPTY;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = () => { cache = read(); cb(); };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

function emit() {
  cache = read();
  for (const cb of listeners) cb();
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

export function saveEntry(input: {
  filmId: string; cry: number; ratings: RatingMap; note?: string;
}): LogEntry {
  const entry: LogEntry = {
    id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    userId: 'local',
    filmId: input.filmId,
    cry: input.cry,
    ratings: input.ratings,
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...(cache ?? read())];
  write(next);
  emit();
  return entry;
}

export function deleteEntry(id: string) {
  const next = (cache ?? read()).filter(e => e.id !== id);
  write(next);
  emit();
}
