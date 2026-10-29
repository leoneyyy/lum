-- Lumiere: community ratings, charts and suggested people.
--
-- log_entries are private by default, so nothing here exposes rows: each
-- function is security definer and returns aggregates only.
--  * A person counts once per film: the average of their scored entries
--    (rewatches don't stack).
--  * "Scored" excludes entries with cry 0 and no dimension ratings, i.e.
--    logs without a score (e.g. a Letterboxd diary row without stars).
--  * Nothing is reported for a film until at least 3 people scored it, so
--    one person's private score can't be read off an average.
--  * Suggestions only look at what candidates already show publicly
--    (public entries, top picks, watched when shared), so they can't be used
--    to probe someone's private log.

create index if not exists log_entries_film_idx on public.log_entries (film_id);

-- per person and film: their average cry over scored entries
create or replace function public._person_film_scores()
returns table (user_id uuid, film_id text, cry numeric)
language sql stable security definer set search_path = public as $$
  select e.user_id, e.film_id, avg(e.cry)::numeric
  from public.log_entries e
  where not (e.cry = 0 and coalesce(e.ratings, '{}'::jsonb) = '{}'::jsonb)
  group by e.user_id, e.film_id
$$;
revoke all on function public._person_film_scores() from public;

-- ── one film ─────────────────────────────────────────────────────────

create or replace function public.film_community_stats(p_film_id text)
returns table (
  raters integer,      -- people who scored it (0 when below the threshold)
  avg_cry integer,     -- 0..100
  buckets integer[],   -- people per 20-point band: 0-19, 20-39, 40-59, 60-79, 80-100
  dims jsonb           -- {"plot": 4.2, ...}, only dimensions rated by >= 3 people
)
language plpgsql stable security definer set search_path = public as $$
declare
  min_raters constant integer := 3;
  n integer;
begin
  select count(*) into n from public._person_film_scores() s where s.film_id = p_film_id;
  if n < min_raters then
    return query select 0, null::integer, null::integer[], '{}'::jsonb;
    return;
  end if;

  return query
  with per_person as (
    select s.cry from public._person_film_scores() s where s.film_id = p_film_id
  ),
  dim_person as (
    select e.user_id, d.key as dim, avg(d.value::numeric) as v
    from public.log_entries e, jsonb_each_text(coalesce(e.ratings, '{}'::jsonb)) d
    where e.film_id = p_film_id and d.value ~ '^[0-9]+(\.[0-9]+)?$'
    group by e.user_id, d.key
  ),
  dim_avg as (
    select dim, round(avg(v), 1) as v from dim_person group by dim having count(*) >= min_raters
  )
  select
    n,
    round(avg(p.cry))::integer,
    array[
      count(*) filter (where p.cry < 20),
      count(*) filter (where p.cry >= 20 and p.cry < 40),
      count(*) filter (where p.cry >= 40 and p.cry < 60),
      count(*) filter (where p.cry >= 60 and p.cry < 80),
      count(*) filter (where p.cry >= 80)
    ]::integer[],
    coalesce((select jsonb_object_agg(dim, v) from dim_avg), '{}'::jsonb)
  from per_person p;
end;
$$;

-- ── charts ───────────────────────────────────────────────────────────

-- Ranked films. 'rating' orders by a Bayesian average (IMDb-style): a film's
-- mean is pulled toward the overall mean until enough people have scored it,
-- so three perfect scores don't outrank two hundred near-perfect ones.
-- 'popular' orders by how many people scored it. Capped at the top 500.
create or replace function public.film_leaderboard(
  p_order text default 'rating',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (rank integer, film_id text, raters integer, avg_cry integer, score numeric)
language sql stable security definer set search_path = public as $$
  with s as (select * from public._person_film_scores()),
  films as (
    select s.film_id, count(*)::integer as v, avg(s.cry) as r
    from s group by s.film_id
    having count(*) >= 3
  ),
  prior as (select coalesce(avg(cry), 50) as c from s),
  scored as (
    select f.film_id, f.v, f.r,
           (f.v / (f.v + 5.0)) * f.r + (5.0 / (f.v + 5.0)) * prior.c as score
    from films f, prior
  ),
  ranked as (
    select row_number() over (
             order by
               case when p_order = 'popular' then sc.v end desc nulls last,
               sc.score desc, sc.v desc, sc.film_id
           )::integer as rank,
           sc.film_id, sc.v, sc.r, sc.score
    from scored sc
  )
  select rk.rank, rk.film_id, rk.v, round(rk.r)::integer, round(rk.score, 1)
  from ranked rk
  where rk.rank > greatest(p_offset, 0)
    and rk.rank <= least(greatest(p_offset, 0) + least(greatest(p_limit, 1), 100), 500)
  order by rk.rank
$$;

-- ── suggested people ─────────────────────────────────────────────────

-- People you don't follow yet, ranked by how many films they show publicly
-- that you've logged or watched, then by followers.
create or replace function public.suggested_profiles(p_limit integer default 12)
returns table (
  id uuid, handle text, name text, avatar_url text,
  shared integer, followers integer
)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as uid),
  my_films as (
    select e.film_id from public.log_entries e, me where e.user_id = me.uid
    union select w.film_id from public.watched w, me where w.user_id = me.uid
  ),
  their_public as (
    select e.user_id, e.film_id from public.log_entries e where e.visibility = 'public'
    union select p.id, unnest(p.top_films || p.top_series) from public.profiles p
    union select w.user_id, w.film_id from public.watched w
      join public.profiles p on p.id = w.user_id and p.show_watched
  ),
  overlap as (
    select t.user_id, count(distinct t.film_id)::integer as shared
    from their_public t join my_films m on m.film_id = t.film_id
    group by t.user_id
  ),
  follower_counts as (
    select f.followee_id, count(*)::integer as followers from public.follows f group by f.followee_id
  )
  select p.id, p.handle, p.name, p.avatar_url,
         coalesce(o.shared, 0), coalesce(fc.followers, 0)
  from public.profiles p
  cross join me
  left join overlap o on o.user_id = p.id
  left join follower_counts fc on fc.followee_id = p.id
  where me.uid is not null
    and p.id <> me.uid
    and not exists (select 1 from public.follows f where f.follower_id = me.uid and f.followee_id = p.id)
  order by coalesce(o.shared, 0) desc, coalesce(fc.followers, 0) desc, p.created_at desc
  limit least(greatest(p_limit, 1), 50)
$$;

revoke all on function public.film_community_stats(text) from public;
revoke all on function public.film_leaderboard(text, integer, integer) from public;
revoke all on function public.suggested_profiles(integer) from public;
grant execute on function public.film_community_stats(text) to anon, authenticated;
grant execute on function public.film_leaderboard(text, integer, integer) to anon, authenticated;
grant execute on function public.suggested_profiles(integer) to authenticated;
