-- Lumiere: user-curated lists of films, separate from log/watched/watchlist.

create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  visibility  text not null default 'private'
              check (visibility in ('private', 'public')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists lists_user_idx
  on public.lists (user_id, updated_at desc);

create table if not exists public.list_films (
  list_id    uuid not null references public.lists(id) on delete cascade,
  film_id    text not null,
  position   integer not null default 0,
  added_at   timestamptz not null default now(),
  primary key (list_id, film_id)
);

create index if not exists list_films_list_idx
  on public.list_films (list_id, position);

alter table public.lists enable row level security;
alter table public.list_films enable row level security;

drop policy if exists "lists readable"        on public.lists;
drop policy if exists "own lists insertable"  on public.lists;
drop policy if exists "own lists updatable"   on public.lists;
drop policy if exists "own lists deletable"   on public.lists;

create policy "lists readable"
  on public.lists for select
  using (visibility = 'public' or auth.uid() = user_id);

create policy "own lists insertable"
  on public.lists for insert with check (auth.uid() = user_id);

create policy "own lists updatable"
  on public.lists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own lists deletable"
  on public.lists for delete using (auth.uid() = user_id);

drop policy if exists "list_films readable"        on public.list_films;
drop policy if exists "own list_films insertable"  on public.list_films;
drop policy if exists "own list_films deletable"   on public.list_films;

create policy "list_films readable"
  on public.list_films for select
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_films.list_id
        and (l.visibility = 'public' or l.user_id = auth.uid())
    )
  );

create policy "own list_films insertable"
  on public.list_films for insert
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_films.list_id and l.user_id = auth.uid()
    )
  );

create policy "own list_films deletable"
  on public.list_films for delete
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_films.list_id and l.user_id = auth.uid()
    )
  );
