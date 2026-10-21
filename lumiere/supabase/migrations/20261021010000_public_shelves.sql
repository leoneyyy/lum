-- Lumiere: let people show their watched films on their public profile.
-- Off by default; public lists already have their own visibility flag.

alter table public.profiles
  add column if not exists show_watched boolean not null default false;

-- Policies are OR'd, so this adds to "own watched readable" rather than
-- replacing it: anyone may read someone's watched rows once they opt in.
drop policy if exists "watched readable when shared" on public.watched;
create policy "watched readable when shared"
  on public.watched for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = watched.user_id and p.show_watched
    )
  );
