-- Lumiere: lightweight "watched" toggle, distinct from log_entries.
-- A row here means "I've seen this", without the emotional weight of a logged night.
-- Saving a log entry should not auto-mark watched — keeping these decoupled lets
-- the importer and UI choose explicitly.

create table if not exists public.watched (
  user_id    uuid not null references auth.users(id) on delete cascade,
  film_id    text not null,
  watched_at timestamptz not null default now(),
  primary key (user_id, film_id)
);

create index if not exists watched_user_idx
  on public.watched (user_id, watched_at desc);

alter table public.watched enable row level security;

drop policy if exists "own watched readable"   on public.watched;
drop policy if exists "own watched insertable" on public.watched;
drop policy if exists "own watched updatable"  on public.watched;
drop policy if exists "own watched deletable"  on public.watched;

create policy "own watched readable"
  on public.watched for select
  using (auth.uid() = user_id);

create policy "own watched insertable"
  on public.watched for insert
  with check (auth.uid() = user_id);

create policy "own watched updatable"
  on public.watched for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own watched deletable"
  on public.watched for delete
  using (auth.uid() = user_id);
