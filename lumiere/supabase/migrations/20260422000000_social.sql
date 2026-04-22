-- Lumiere social layer: profiles, follows, public entries.
-- Requires 20260421000000_init.sql.

-- 1. profiles: public display identity, 1:1 with auth.users
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  handle      text not null,
  name        text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists profiles_handle_key
  on public.profiles (lower(handle));

alter table public.profiles enable row level security;

drop policy if exists "profiles are public"       on public.profiles;
drop policy if exists "own profile insertable"    on public.profiles;
drop policy if exists "own profile updatable"     on public.profiles;
drop policy if exists "own profile deletable"     on public.profiles;

create policy "profiles are public"
  on public.profiles for select
  using (true);

create policy "own profile insertable"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "own profile updatable"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "own profile deletable"
  on public.profiles for delete
  using (auth.uid() = id);

-- 2. follows: directed edges
create table if not exists public.follows (
  follower_id  uuid not null references auth.users(id) on delete cascade,
  followee_id  uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on public.follows (followee_id);
create index if not exists follows_follower_idx on public.follows (follower_id);

alter table public.follows enable row level security;

drop policy if exists "follows readable to endpoints" on public.follows;
drop policy if exists "follows insertable by follower" on public.follows;
drop policy if exists "follows deletable by follower"  on public.follows;

create policy "follows readable to endpoints"
  on public.follows for select
  using (auth.uid() = follower_id or auth.uid() = followee_id);

create policy "follows insertable by follower"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "follows deletable by follower"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- 3. add visibility to log_entries
alter table public.log_entries
  add column if not exists visibility text not null default 'private'
    check (visibility in ('private', 'public'));

create index if not exists log_entries_visibility_idx
  on public.log_entries (visibility, created_at desc)
  where visibility = 'public';

-- 4. additional log_entries policies for public feed
drop policy if exists "public entries readable by followers" on public.log_entries;

create policy "public entries readable by followers"
  on public.log_entries for select
  using (
    visibility = 'public'
    and exists (
      select 1 from public.follows
      where follower_id = auth.uid() and followee_id = log_entries.user_id
    )
  );
