-- Enable needed extensions (safe if already enabled)
create extension if not exists pgcrypto with schema extensions;

-- A) Grade-based standards table (FR=9, SO=10, JR=11, SR=12)
create table if not exists public.rating_standards_grade (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  grade smallint not null check (grade between 9 and 12),
  gender text not null check (gender in ('M','F','U')),
  is_time boolean not null,
  star3 numeric,
  star4 numeric,
  star5 numeric,
  source text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (event, grade, gender)
);

alter table public.rating_standards_grade enable row level security;

-- Read for everyone
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='rating_standards_grade' and policyname='rating_standards_grade read'
  ) then
    create policy "rating_standards_grade read"
      on public.rating_standards_grade for select using (true);
  end if;
end$$;

-- Write only for admins (expects public.admins(user_id))
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='rating_standards_grade' and policyname='rating_standards_grade write by admins'
  ) then
    create policy "rating_standards_grade write by admins"
      on public.rating_standards_grade for all
      using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
      with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));
  end if;
end$$;

-- B) Helpers: school-year boundary (Aug 15) and grade-at-meet
create or replace function public.school_year_end(p_date date)
returns int
language sql
immutable
as $$
  select extract(year from case
    when p_date < make_date(extract(year from p_date)::int, 8, 15)
      then make_date(extract(year from p_date)::int, 8, 15)
    else make_date((extract(year from p_date)::int) + 1, 8, 15)
  end)::int
$$;

create or replace function public.grade_at_meet(p_meet_date date, p_class_year int)
returns int
language sql
immutable
as $$
  -- Senior if school_year_end(meet) == class_year, junior if -1, etc.
  select 12 - (p_class_year - public.school_year_end(p_meet_date))
$$;

-- C) Eligibility by GRADE for a specific cohort (Class Year)
create or replace function public.eligible_athletes_by_grade(
  p_event text,
  p_grade int,          -- 9..12
  p_class_year int,     -- 2026..2029 etc.
  p_gender text         -- 'M','F','U' to filter cohort; standards may be 'U'
)
returns table (
  athlete_id uuid,
  username text,
  full_name text,
  best_time numeric,
  best_mark numeric,
  eligible_star int
)
language sql
security definer
set search_path = public
as $$
  with cohort as (
    select
      pr.id,
      pr.username,
      pr.full_name,
      case
        when pr.gender ilike 'm%' or pr.gender ilike 'boy%'  or pr.gender ilike 'men%'  then 'M'
        when pr.gender ilike 'f%' or pr.gender ilike 'girl%' or pr.gender ilike 'women%' then 'F'
        else 'U'
      end as gender_norm,
      pr.class_year
    from profiles pr
    where pr.class_year = p_class_year
  ),
  marks as (
    select
      r.athlete_id,
      min(r.mark_seconds_adj) filter (where r.mark_seconds_adj is not null) as best_time,
      max(r.mark_metric)      filter (where r.mark_metric      is not null) as best_mark
    from results r
    join cohort c on c.id = r.athlete_id
    where r.event = p_event
      and r.meet_date is not null
      and r.status in ('verified','approved','imported')
      and public.grade_at_meet(r.meet_date::date, c.class_year) = p_grade
    group by r.athlete_id
  ),
  std as (
    select *
    from rating_standards_grade s
    where s.event = p_event
      and s.grade = p_grade
      and (s.gender = p_gender or p_gender = 'U' or s.gender = 'U')
  )
  select
    c.id as athlete_id,
    c.username,
    c.full_name,
    m.best_time,
    m.best_mark,
    case
      when exists (select 1 from std s where s.is_time and m.best_time is not null and s.star5 is not null and m.best_time <= s.star5)
        or exists (select 1 from std s where not s.is_time and m.best_mark is not null and s.star5 is not null and m.best_mark >= s.star5)
        then 5
      when exists (select 1 from std s where s.is_time and m.best_time is not null and s.star4 is not null and m.best_time <= s.star4)
        or exists (select 1 from std s where not s.is_time and m.best_mark is not null and s.star4 is not null and m.best_mark >= s.star4)
        then 4
      when exists (select 1 from std s where s.is_time and m.best_time is not null and s.star3 is not null and m.best_time <= s.star3)
        or exists (select 1 from std s where not s.is_time and m.best_mark is not null and s.star3 is not null and m.best_mark >= s.star3)
        then 3
      else null
    end as eligible_star
  from cohort c
  join marks m on m.athlete_id = c.id
  where (p_gender = 'U' or c.gender_norm = p_gender or c.gender_norm = 'U')
  order by coalesce(m.best_time, 99999), coalesce(-m.best_mark, 0);
$$;

grant execute on function public.eligible_athletes_by_grade(text,int,int,text) to authenticated;
