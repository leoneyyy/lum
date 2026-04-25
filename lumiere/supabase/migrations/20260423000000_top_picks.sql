-- Lumiere top picks: a canon of up to 4 films + 4 series shown on profiles.
-- Stored as text[] of our internal film ids (e.g. tmdb_m_42, tmdb_t_900,
-- or even tmdb_t_900_s1_e3). The 4-cap is enforced client-side for now;
-- we just keep the columns small.

alter table public.profiles
  add column if not exists top_films  text[] not null default '{}'::text[],
  add column if not exists top_series text[] not null default '{}'::text[];
