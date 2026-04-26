'use client';
import React from 'react';
import type { Film, LogEntry } from './types';
import { getFilm } from './api';

export function useFilmsByIds(rawIds: readonly string[]): Record<string, Film> {
  const [films, setFilms] = React.useState<Record<string, Film>>({});
  const ids = React.useMemo(
    () => Array.from(new Set(rawIds)).sort().join('|'),
    [rawIds],
  );

  React.useEffect(() => {
    const need = ids.split('|').filter(Boolean).filter(id => !films[id]);
    if (need.length === 0) return;
    let cancel = false;
    void Promise.all(need.map(id => getFilm(id).then(f => [id, f] as const))).then(pairs => {
      if (cancel) return;
      setFilms(prev => {
        const next = { ...prev };
        for (const [id, f] of pairs) if (f) next[id] = f;
        return next;
      });
    });
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  return films;
}

export function useFilmsForEntries(entries: LogEntry[]): Record<string, Film> {
  return useFilmsByIds(entries.map(e => e.filmId));
}
