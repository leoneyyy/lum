-- Lumiere: per-user theme override for the public profile.
-- When set, /u/<handle> and the owner's own /profile preview render in
-- this theme regardless of the viewer's tweaks.

alter table public.profiles
  add column if not exists public_theme text;

-- Soft validation; app code is the source of truth.
alter table public.profiles
  drop constraint if exists profiles_public_theme_check;

alter table public.profiles
  add constraint profiles_public_theme_check
  check (public_theme is null or public_theme in ('indigo', 'oxblood', 'bone', 'acid'));
