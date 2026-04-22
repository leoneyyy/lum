-- Lumiere reactions layer: one-tap "felt this" on entries.
-- Requires 20260422000000_social.sql.

create table if not exists public.reactions (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.log_entries(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null default 'heart' check (type in ('heart')),
  created_at  timestamptz not null default now(),
  unique (entry_id, user_id, type)
);

create index if not exists reactions_entry_idx on public.reactions (entry_id);
create index if not exists reactions_user_idx  on public.reactions (user_id);

alter table public.reactions enable row level security;

drop policy if exists "reactions readable with entry access" on public.reactions;
drop policy if exists "reactions insertable with entry access" on public.reactions;
drop policy if exists "own reaction deletable"             on public.reactions;

-- Readable wherever the underlying entry is readable: own entry, or a
-- public entry whose author the viewer follows.
create policy "reactions readable with entry access"
  on public.reactions for select
  using (
    exists (
      select 1 from public.log_entries e
      where e.id = reactions.entry_id
      and (
        e.user_id = auth.uid()
        or (
          e.visibility = 'public'
          and exists (
            select 1 from public.follows
            where follower_id = auth.uid() and followee_id = e.user_id
          )
        )
      )
    )
  );

-- Same access gate for inserts, plus self-only user_id.
create policy "reactions insertable with entry access"
  on public.reactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.log_entries e
      where e.id = reactions.entry_id
      and (
        e.user_id = auth.uid()
        or (
          e.visibility = 'public'
          and exists (
            select 1 from public.follows
            where follower_id = auth.uid() and followee_id = e.user_id
          )
        )
      )
    )
  );

create policy "own reaction deletable"
  on public.reactions for delete
  using (auth.uid() = user_id);
