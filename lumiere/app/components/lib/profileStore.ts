'use client';
import React from 'react';
import type { Profile } from './types';
import { getSupabase } from './supabase';

type Row = {
  id: string;
  handle: string;
  name: string | null;
  bio: string | null;
  created_at: string;
  top_films: string[] | null;
  top_series: string[] | null;
};

function rowToProfile(r: Row): Profile {
  return {
    id: r.id,
    handle: r.handle,
    name: r.name ?? undefined,
    bio: r.bio ?? undefined,
    createdAt: r.created_at,
    topFilms: r.top_films ?? [],
    topSeries: r.top_series ?? [],
  };
}

// ── my profile ─────────────────────────────────────────────────────

type ProfileLoadState = 'idle' | 'loading' | 'loaded' | 'missing';

let myUserId: string | null = null;
let myProfile: Profile | null = null;
let myProfileState: ProfileLoadState = 'idle';
const myListeners = new Set<() => void>();
const notifyMine = () => { for (const cb of myListeners) cb(); };

async function loadMine() {
  const sb = getSupabase();
  if (!sb || !myUserId) return;
  myProfileState = 'loading';
  notifyMine();
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', myUserId)
    .maybeSingle();
  if (error) {
    console.error('[lumiere] profile fetch failed', error.message);
    myProfileState = 'missing';
    notifyMine();
    return;
  }
  myProfile = data ? rowToProfile(data as Row) : null;
  myProfileState = myProfile ? 'loaded' : 'missing';
  notifyMine();
}

export function setProfileUser(userId: string | null) {
  if (myUserId === userId) return;
  myUserId = userId;
  myProfile = null;
  myProfileState = 'idle';
  notifyMine();
  if (userId) void loadMine();
}

interface MyProfileView {
  profile: Profile | null;
  state: ProfileLoadState;
}

const EMPTY_VIEW: MyProfileView = { profile: null, state: 'idle' };
let viewCache: MyProfileView = EMPTY_VIEW;
let lastProfile: Profile | null = null;
let lastState: ProfileLoadState = 'idle';
function viewSnapshot(): MyProfileView {
  if (lastProfile !== myProfile || lastState !== myProfileState) {
    lastProfile = myProfile;
    lastState = myProfileState;
    viewCache = { profile: myProfile, state: myProfileState };
  }
  return viewCache;
}
function viewServerSnapshot(): MyProfileView { return EMPTY_VIEW; }
function viewSubscribe(cb: () => void): () => void {
  myListeners.add(cb);
  return () => { myListeners.delete(cb); };
}

export function useMyProfile(): MyProfileView {
  return React.useSyncExternalStore(viewSubscribe, viewSnapshot, viewServerSnapshot);
}

export async function saveMyProfile(patch: { handle?: string; name?: string; bio?: string }): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !myUserId) return 'not signed in';
  const handle = patch.handle?.trim().toLowerCase();
  if (handle !== undefined && !/^[a-z0-9_]{3,24}$/.test(handle)) {
    return 'handle must be 3–24 chars · letters, digits, underscore';
  }
  const row = {
    id: myUserId,
    handle: handle ?? myProfile?.handle ?? '',
    name: patch.name?.trim() || null,
    bio: patch.bio?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (!row.handle) return 'handle required';
  const { data, error } = await sb
    .from('profiles')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return 'handle taken';
    return error.message;
  }
  myProfile = rowToProfile(data as Row);
  myProfileState = 'loaded';
  notifyMine();
  return null;
}

export async function setTopPicks(patch: { topFilms?: string[]; topSeries?: string[] }): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !myUserId || !myProfile) return 'not signed in';
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.topFilms) update.top_films = patch.topFilms.slice(0, 4);
  if (patch.topSeries) update.top_series = patch.topSeries.slice(0, 4);

  // optimistic
  const prev = myProfile;
  myProfile = {
    ...myProfile,
    topFilms: patch.topFilms ? patch.topFilms.slice(0, 4) : myProfile.topFilms,
    topSeries: patch.topSeries ? patch.topSeries.slice(0, 4) : myProfile.topSeries,
  };
  notifyMine();

  const { data, error } = await sb
    .from('profiles')
    .update(update)
    .eq('id', myUserId)
    .select()
    .single();
  if (error) {
    myProfile = prev;
    notifyMine();
    return error.message;
  }
  myProfile = rowToProfile(data as Row);
  notifyMine();
  return null;
}

// ── other profiles by id / handle ─────────────────────────────────

const profileCache = new Map<string, Profile | null>();         // by id
const handleCache = new Map<string, Profile | null>();          // by lowercase handle
const profilesByIdListeners = new Set<() => void>();
const notifyProfiles = () => { for (const cb of profilesByIdListeners) cb(); };

export function useProfiles(ids: string[]): Record<string, Profile> {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const cb = () => setTick(t => t + 1);
    profilesByIdListeners.add(cb);
    return () => { profilesByIdListeners.delete(cb); };
  }, []);

  const key = React.useMemo(() => Array.from(new Set(ids)).sort().join('|'), [ids]);

  React.useEffect(() => {
    const need = key.split('|').filter(Boolean).filter(id => !profileCache.has(id));
    if (need.length === 0) return;
    const sb = getSupabase();
    if (!sb) return;
    let cancel = false;
    void sb.from('profiles').select('*').in('id', need).then(({ data, error }) => {
      if (cancel) return;
      if (error) {
        console.error('[lumiere] profiles batch failed', error.message);
        for (const id of need) profileCache.set(id, null);
      } else {
        const got = new Set<string>();
        for (const r of (data as Row[]) ?? []) {
          const p = rowToProfile(r);
          profileCache.set(p.id, p);
          handleCache.set(p.handle.toLowerCase(), p);
          got.add(p.id);
        }
        for (const id of need) if (!got.has(id)) profileCache.set(id, null);
      }
      notifyProfiles();
    });
    return () => { cancel = true; };
  }, [key]);

  const out: Record<string, Profile> = {};
  for (const id of key.split('|').filter(Boolean)) {
    const p = profileCache.get(id);
    if (p) out[id] = p;
  }
  return out;
}

export async function fetchProfileByHandle(handle: string): Promise<Profile | null> {
  const key = handle.trim().toLowerCase();
  if (!key) return null;
  if (handleCache.has(key)) return handleCache.get(key) ?? null;
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .ilike('handle', key)
    .maybeSingle();
  if (error) {
    console.error('[lumiere] profile by handle failed', error.message);
    handleCache.set(key, null);
    return null;
  }
  const p = data ? rowToProfile(data as Row) : null;
  handleCache.set(key, p);
  if (p) profileCache.set(p.id, p);
  notifyProfiles();
  return p;
}

export async function searchProfiles(query: string, limit = 12): Promise<Profile[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .ilike('handle', `%${q}%`)
    .order('handle', { ascending: true })
    .limit(limit);
  if (error) {
    console.error('[lumiere] profile search failed', error.message);
    return [];
  }
  const rows = (data as Row[]) ?? [];
  for (const r of rows) {
    const p = rowToProfile(r);
    profileCache.set(p.id, p);
    handleCache.set(p.handle.toLowerCase(), p);
  }
  if (rows.length) notifyProfiles();
  return rows.map(rowToProfile);
}
