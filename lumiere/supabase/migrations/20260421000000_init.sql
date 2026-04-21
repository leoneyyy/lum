-- Lumiere schema. Requires anonymous sign-in enabled in auth settings.

create table if not exists public.log_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  film_id     text not null,
  cry         smallint not null check (cry between 0 and 100),
  ratings     jsonb not null default '{}'::jsonb,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists log_entries_user_created_idx
  on public.log_entries (user_id, created_at desc);

create index if not exists log_entries_user_film_idx
  on public.log_entries (user_id, film_id);

alter table public.log_entries enable row level security;

drop policy if exists "own entries readable"   on public.log_entries;
drop policy if exists "own entries insertable" on public.log_entries;
drop policy if exists "own entries updatable"  on public.log_entries;
drop policy if exists "own entries deletable"  on public.log_entries;

create policy "own entries readable"
  on public.log_entries for select
  using (auth.uid() = user_id);

create policy "own entries insertable"
  on public.log_entries for insert
  with check (auth.uid() = user_id);

create policy "own entries updatable"
  on public.log_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own entries deletable"
  on public.log_entries for delete
  using (auth.uid() = user_id);
