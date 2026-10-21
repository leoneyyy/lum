-- Lumiere: things you want to watch.
-- Distinct from `watched` (already seen) — same minimal shape.

create table if not exists public.watchlist (
  user_id   uuid not null references auth.users(id) on delete cascade,
  film_id   text not null,
  added_at  timestamptz not null default now(),
  primary key (user_id, film_id)
);

create index if not exists watchlist_user_idx
  on public.watchlist (user_id, added_at desc);

alter table public.watchlist enable row level security;

drop policy if exists "own watchlist readable"   on public.watchlist;
drop policy if exists "own watchlist insertable" on public.watchlist;
drop policy if exists "own watchlist updatable"  on public.watchlist;
drop policy if exists "own watchlist deletable"  on public.watchlist;

create policy "own watchlist readable"
  on public.watchlist for select using (auth.uid() = user_id);
create policy "own watchlist insertable"
  on public.watchlist for insert with check (auth.uid() = user_id);
create policy "own watchlist updatable"
  on public.watchlist for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own watchlist deletable"
  on public.watchlist for delete using (auth.uid() = user_id);
