-- Lumiere: per-user rate limit for our TMDB proxy routes (/api/films/*,
-- /api/people/*). Fixed window per user, counted atomically in one upsert.
--
-- The server calls hit_api_rate_limit() with the caller's own JWT, so the
-- counter is keyed on auth.uid() and nobody can touch anyone else's row.
-- The table has RLS on and no policies: it's only reachable through the
-- security-definer function below.

create table if not exists public.api_rate_limits (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  hits         integer not null default 0
);

alter table public.api_rate_limits enable row level security;

create or replace function public.hit_api_rate_limit(
  max_hits integer default 600,
  window_seconds integer default 60
)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  now_ts timestamptz := now();
  win interval := make_interval(secs => window_seconds);
  cur public.api_rate_limits;
begin
  if uid is null then
    return query select false, window_seconds;
    return;
  end if;

  insert into public.api_rate_limits as r (user_id, window_start, hits)
  values (uid, now_ts, 1)
  on conflict (user_id) do update set
    window_start = case when r.window_start <= now_ts - win then now_ts else r.window_start end,
    hits         = case when r.window_start <= now_ts - win then 1 else r.hits + 1 end
  returning * into cur;

  if cur.hits <= max_hits then
    return query select true, 0;
  else
    return query select false,
      greatest(1, ceil(extract(epoch from (cur.window_start + win - now_ts)))::integer);
  end if;
end;
$$;

revoke all on function public.hit_api_rate_limit(integer, integer) from public;
grant execute on function public.hit_api_rate_limit(integer, integer) to authenticated;
