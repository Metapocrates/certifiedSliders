-- High school directory schema, staging tables, and search support

create extension if not exists pg_trgm;
create extension if not exists unaccent;

create schema if not exists staging;

create table if not exists public.schools_highschool (
  id bigserial primary key,
  nces_id text unique,
  school_name text not null,
  school_name_norm text,
  school_type text check (school_type in ('Public','Private')),
  address text,
  address_norm text,
  city text,
  city_norm text,
  state char(2) not null,
  zip text,
  phone text,
  website text,
  district_name text,
  district_id text,
  grades text,
  level text,
  latitude double precision,
  longitude double precision,
  source text,
  imported_at timestamptz not null default timezone('utc', now()),
  is_active boolean not null default true,
  unique (state, city_norm, school_name_norm, coalesce(address_norm, ''))
);

create table if not exists staging.public_schools_stage (
  geo_point_2d text,
  geo_shape text,
  objectid text,
  ncesid text,
  name text,
  address text,
  city text,
  state text,
  zip text,
  zip4 text,
  telephone text,
  type text,
  status text,
  population text,
  county text,
  countyfips text,
  country text,
  latitude double precision,
  longitude double precision,
  naics_code text,
  naics_desc text,
  source text,
  sourcedate text,
  val_method text,
  val_date text,
  website text,
  level text,
  enrollment text,
  st_grade text,
  end_grade text,
  districtid text,
  ft_teacher text,
  shelter_id text,
  imported_at timestamptz not null default timezone('utc', now())
);

create table if not exists staging.private_schools_stage (
  geo_point_2d text,
  geo_shape text,
  objectid text,
  ncesid text,
  name text,
  address text,
  city text,
  state text,
  zip text,
  zip4 text,
  telephone text,
  type text,
  status text,
  population text,
  county text,
  countyfips text,
  country text,
  latitude double precision,
  longitude double precision,
  naics_code text,
  naics_desc text,
  source text,
  source_date text,
  val_method text,
  val_date text,
  website text,
  level text,
  enrollment text,
  st_grade text,
  end_grade text,
  ft_teachers text,
  shelter_id text,
  imported_at timestamptz not null default timezone('utc', now())
);

create or replace function public.normalize_school_name(txt text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(unaccent(coalesce(txt, ''))),
          '\bhigh school\b', 'hs', 'gi'
        ),
        '\bsaint\b', 'st', 'gi'
      ),
      '\s+', ' ', 'g'
    )
  );
$$;

create or replace function public.normalize_simple_text(txt text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      lower(unaccent(coalesce(txt, ''))),
      '\s+', ' ',
      'g'
    )
  );
$$;

create or replace function public.schools_normalize_columns()
returns trigger
language plpgsql
as $$
begin
  new.school_name_norm := public.normalize_school_name(new.school_name);
  new.address_norm := public.normalize_simple_text(new.address);
  new.city_norm := public.normalize_simple_text(new.city);
  return new;
end;
$$;

alter table public.schools_highschool
  add column if not exists search_tsv tsvector;

create or replace function public.schools_search_tsv_update()
returns trigger
language plpgsql
as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.school_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.city, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.state, '')), 'C');
  return new;
end;
$$;

drop trigger if exists trg_schools_tsv on public.schools_highschool;
create trigger trg_schools_tsv
  before insert or update on public.schools_highschool
  for each row
  execute function public.schools_search_tsv_update();

drop trigger if exists trg_schools_normalize on public.schools_highschool;
create trigger trg_schools_normalize
  before insert or update on public.schools_highschool
  for each row
  execute function public.schools_normalize_columns();

create index if not exists idx_schools_hs_state on public.schools_highschool (state);
create index if not exists idx_schools_hs_state_city_name on public.schools_highschool (state, city_norm, school_name_norm);
create index if not exists idx_schools_hs_trgm_name on public.schools_highschool using gin (school_name_norm gin_trgm_ops);
create index if not exists idx_schools_hs_trgm_city on public.schools_highschool using gin (city_norm gin_trgm_ops);
create index if not exists idx_schools_hs_tsv on public.schools_highschool using gin (search_tsv);

create materialized view if not exists public.v_schools_search as
select
  id,
  nces_id,
  school_name,
  school_type,
  city,
  state,
  zip,
  latitude,
  longitude,
  search_tsv
from public.schools_highschool
where is_active = true;

create unique index if not exists idx_v_schools_search_id on public.v_schools_search (id);

create or replace procedure public.refresh_v_schools_search()
language sql
as $$
  refresh materialized view concurrently public.v_schools_search;
$$;

alter table public.schools_highschool enable row level security;

drop policy if exists "Public read schools" on public.schools_highschool;
create policy "Public read schools"
  on public.schools_highschool
  for select
  using (true);

drop policy if exists "Admins manage schools" on public.schools_highschool;
create policy "Admins manage schools"
  on public.schools_highschool
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
