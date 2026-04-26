-- Lumiere film overrides: per-user custom poster/backdrop choices.
-- Moves the data from localStorage into Supabase so it survives device
-- changes AND so other users see your curated images on your profile.

create table if not exists public.film_overrides (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  film_id      text not null,
  poster_url   text,
  backdrop_url text,
  updated_at   timestamptz not null default now(),
  unique (user_id, film_id)
);

create index if not exists film_overrides_user_idx on public.film_overrides (user_id);

alter table public.film_overrides enable row level security;

drop policy if exists "overrides public read" on public.film_overrides;
drop policy if exists "own override insert"   on public.film_overrides;
drop policy if exists "own override update"   on public.film_overrides;
drop policy if exists "own override delete"   on public.film_overrides;

-- Public read so a friend visiting /u/<handle> sees the owner's curated
-- posters and backdrops, not just TMDB defaults.
create policy "overrides public read"
  on public.film_overrides for select
  using (true);

create policy "own override insert"
  on public.film_overrides for insert
  with check (auth.uid() = user_id);

create policy "own override update"
  on public.film_overrides for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own override delete"
  on public.film_overrides for delete
  using (auth.uid() = user_id);
