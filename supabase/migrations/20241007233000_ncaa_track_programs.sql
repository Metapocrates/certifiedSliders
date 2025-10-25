create table if not exists public.ncaa_track_programs (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  school_short_name text,
  division text not null,
  conference text,
  sport text not null,
  gender text not null check (gender in ('M','W')),
  data_year int,
  source text default 'NCAA Sponsorship XLSX',
  created_at timestamptz not null default now()
);

create index if not exists idx_ncaa_track_programs_school on public.ncaa_track_programs (school_name);
create index if not exists idx_ncaa_track_programs_div_conf on public.ncaa_track_programs (division, conference);
create index if not exists idx_ncaa_track_programs_sport_gender on public.ncaa_track_programs (sport, gender);

alter table public.ncaa_track_programs enable row level security;

drop policy if exists "Public read ncaa track programs" on public.ncaa_track_programs;
create policy "Public read ncaa track programs"
  on public.ncaa_track_programs
  for select
  using (true);

drop policy if exists "Admins manage ncaa track programs" on public.ncaa_track_programs;
create policy "Admins manage ncaa track programs"
  on public.ncaa_track_programs
  for all
  using (
    auth.uid() in (
      select user_id from public.admins
    )
  )
  with check (
    auth.uid() in (
      select user_id from public.admins
    )
  );
