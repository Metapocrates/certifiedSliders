-- Colleges of interest per athlete
create table if not exists public.athlete_college_interests (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  college_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists athlete_college_interests_unique
  on public.athlete_college_interests (athlete_id, lower(college_name));

alter table public.athlete_college_interests enable row level security;

drop policy if exists "Public read college interests" on public.athlete_college_interests;
create policy "Public read college interests"
  on public.athlete_college_interests
  for select
  using (true);

drop policy if exists "Athlete manage own college interests" on public.athlete_college_interests;
create policy "Athlete manage own college interests"
  on public.athlete_college_interests
  for all
  using (auth.uid() = athlete_id)
  with check (auth.uid() = athlete_id);
