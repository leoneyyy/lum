'use client';
import React from 'react';
import { getSupabase } from './supabase';

export interface ListMeta {
  id: string;
  userId: string;
  name: string;
  description?: string;
  visibility: 'private' | 'public';
  createdAt: string;
  updatedAt: string;
}

export interface ListWithFilms extends ListMeta {
  filmIds: string[];
}

type LoadState = 'idle' | 'loading' | 'loaded';

let myUserId: string | null = null;
let lists: ListMeta[] = [];
let memberships: Map<string, Set<string>> = new Map(); // listId -> Set<filmId>
let state: LoadState = 'idle';
let version = 0;
const listeners = new Set<() => void>();
const notify = () => { version++; for (const cb of listeners) cb(); };

async function load() {
  const sb = getSupabase();
  if (!sb || !myUserId) return;
  state = 'loading';
  notify();
  const { data, error } = await sb
    .from('lists')
    .select('id,user_id,name,description,visibility,created_at,updated_at')
    .eq('user_id', myUserId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('[lumiere] lists fetch failed', error.message);
    state = 'loaded';
    lists = [];
    notify();
    return;
  }
  lists = (data ?? []).map(rowToMeta);

  // load memberships in one query
  if (lists.length > 0) {
    const ids = lists.map(l => l.id);
    const { data: lf, error: lfErr } = await sb
      .from('list_films')
      .select('list_id,film_id')
      .in('list_id', ids);
    if (lfErr) {
      console.error('[lumiere] list_films fetch failed', lfErr.message);
    } else {
      const m = new Map<string, Set<string>>();
      for (const id of ids) m.set(id, new Set());
      for (const row of (lf ?? []) as { list_id: string; film_id: string }[]) {
        m.get(row.list_id)?.add(row.film_id);
      }
      memberships = m;
    }
  } else {
    memberships = new Map();
  }
  state = 'loaded';
  notify();
}

type Row = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
};

function rowToMeta(r: Row): ListMeta {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    description: r.description ?? undefined,
    visibility: r.visibility === 'public' ? 'public' : 'private',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function setListsUser(userId: string | null) {
  if (myUserId === userId) return;
  myUserId = userId;
  lists = [];
  memberships = new Map();
  state = 'idle';
  notify();
  if (userId) void load();
}

type View = { lists: ListMeta[]; state: LoadState };
const EMPTY_VIEW: View = { lists: [] as ListMeta[], state: 'idle' };

let cachedView: View = EMPTY_VIEW;
let cachedViewVersion = -1;

function snapshot(): View {
  if (cachedViewVersion !== version) {
    cachedViewVersion = version;
    cachedView = { lists, state };
  }
  return cachedView;
}
function serverSnapshot(): View { return EMPTY_VIEW; }
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useLists(): View {
  return React.useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

const membershipCache = new Map<string, { v: number; set: Set<string> }>();

export function useListMembership(filmId: string): Set<string> {
  React.useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const cached = membershipCache.get(filmId);
  if (cached && cached.v === version) return cached.set;
  const out = new Set<string>();
  for (const [listId, films] of memberships) {
    if (films.has(filmId)) out.add(listId);
  }
  membershipCache.set(filmId, { v: version, set: out });
  return out;
}

export async function createList(name: string, description?: string, visibility: 'private' | 'public' = 'private'): Promise<{ id?: string; error?: string }> {
  const sb = getSupabase();
  if (!sb || !myUserId) return { error: 'not signed in' };
  const trimmed = name.trim();
  if (!trimmed) return { error: 'name required' };
  const { data, error } = await sb
    .from('lists')
    .insert({
      user_id: myUserId,
      name: trimmed,
      description: description?.trim() || null,
      visibility,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  const meta = rowToMeta(data as Row);
  lists = [meta, ...lists];
  memberships.set(meta.id, new Set());
  notify();
  return { id: meta.id };
}

export async function updateList(id: string, patch: { name?: string; description?: string | null; visibility?: 'private' | 'public' }): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !myUserId) return 'not signed in';
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.description !== undefined) update.description = patch.description?.toString().trim() || null;
  if (patch.visibility !== undefined) update.visibility = patch.visibility;
  const { data, error } = await sb.from('lists').update(update).eq('id', id).select().single();
  if (error) return error.message;
  const meta = rowToMeta(data as Row);
  lists = lists.map(l => l.id === id ? meta : l);
  notify();
  return null;
}

export async function deleteList(id: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !myUserId) return 'not signed in';
  const { error } = await sb.from('lists').delete().eq('id', id);
  if (error) return error.message;
  lists = lists.filter(l => l.id !== id);
  memberships.delete(id);
  notify();
  return null;
}

export async function addFilmToList(listId: string, filmId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !myUserId) return 'not signed in';
  const set = memberships.get(listId);
  if (set?.has(filmId)) return null;
  // optimistic
  if (set) set.add(filmId);
  notify();
  const { error } = await sb.from('list_films').insert({ list_id: listId, film_id: filmId });
  if (error && error.code !== '23505') {
    if (set) set.delete(filmId);
    notify();
    return error.message;
  }
  return null;
}

export async function removeFilmFromList(listId: string, filmId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !myUserId) return 'not signed in';
  const set = memberships.get(listId);
  if (!set?.has(filmId)) return null;
  set.delete(filmId);
  notify();
  const { error } = await sb
    .from('list_films')
    .delete()
    .eq('list_id', listId)
    .eq('film_id', filmId);
  if (error) {
    set.add(filmId);
    notify();
    return error.message;
  }
  return null;
}

export async function fetchListWithFilms(id: string): Promise<ListWithFilms | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: meta, error: mErr } = await sb
    .from('lists')
    .select('id,user_id,name,description,visibility,created_at,updated_at')
    .eq('id', id)
    .maybeSingle();
  if (mErr || !meta) return null;
  const { data: lf, error: lfErr } = await sb
    .from('list_films')
    .select('film_id,position,added_at')
    .eq('list_id', id)
    .order('position', { ascending: true })
    .order('added_at', { ascending: false });
  if (lfErr) return null;
  return {
    ...rowToMeta(meta as Row),
    filmIds: (lf ?? []).map((r: { film_id: string }) => r.film_id),
  };
}
