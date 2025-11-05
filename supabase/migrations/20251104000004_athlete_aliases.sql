-- Phase 1: Profile Aliases / Nicknames
-- Support multiple names for search and display

create type public.alias_type as enum ('nickname', 'alt_legal', 'maiden', 'other');

create table if not exists public.athlete_aliases (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  alias text not null,
  type public.alias_type not null default 'nickname',
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  -- Ensure unique aliases per athlete
  unique (athlete_id, alias)
);

-- Index for efficient queries
create index if not exists athlete_aliases_athlete_id_idx
  on public.athlete_aliases(athlete_id);

-- Index for search by alias
create index if not exists athlete_aliases_alias_idx
  on public.athlete_aliases(lower(alias));

-- Index for public aliases only
create index if not exists athlete_aliases_public_idx
  on public.athlete_aliases(athlete_id, is_public)
  where is_public = true;

-- Enable RLS
alter table public.athlete_aliases enable row level security;

-- Policy: Athletes can read their own aliases
drop policy if exists athlete_aliases_select_own on public.athlete_aliases;
create policy athlete_aliases_select_own
  on public.athlete_aliases
  for select
  using (athlete_id = auth.uid());

-- Policy: Public can read public aliases
drop policy if exists athlete_aliases_select_public on public.athlete_aliases;
create policy athlete_aliases_select_public
  on public.athlete_aliases
  for select
  using (is_public = true);

-- Policy: Athletes can insert their own aliases
drop policy if exists athlete_aliases_insert_own on public.athlete_aliases;
create policy athlete_aliases_insert_own
  on public.athlete_aliases
  for insert
  with check (athlete_id = auth.uid());

-- Policy: Athletes can update their own aliases
drop policy if exists athlete_aliases_update_own on public.athlete_aliases;
create policy athlete_aliases_update_own
  on public.athlete_aliases
  for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

-- Policy: Athletes can delete their own aliases
drop policy if exists athlete_aliases_delete_own on public.athlete_aliases;
create policy athlete_aliases_delete_own
  on public.athlete_aliases
  for delete
  using (athlete_id = auth.uid());

-- Trigger to update updated_at
create or replace function public.update_athlete_aliases_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists update_athlete_aliases_updated_at_trigger
  on public.athlete_aliases;
create trigger update_athlete_aliases_updated_at_trigger
  before update on public.athlete_aliases
  for each row
  execute function public.update_athlete_aliases_updated_at();

comment on table public.athlete_aliases is
'Stores athlete aliases/nicknames for search and display. Primary name remains in profiles.full_name.';
