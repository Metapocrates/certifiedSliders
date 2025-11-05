-- Phase 1: Featured vs Other Events
-- Allow athletes to choose which events are highlighted on their profile

create table if not exists public.athlete_event_preferences (
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  event text not null,
  is_featured boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  primary key (athlete_id, event)
);

-- Index for efficient queries
create index if not exists athlete_event_preferences_athlete_id_idx
  on public.athlete_event_preferences(athlete_id);

create index if not exists athlete_event_preferences_featured_idx
  on public.athlete_event_preferences(athlete_id, is_featured, display_order)
  where is_featured = true;

-- Enable RLS
alter table public.athlete_event_preferences enable row level security;

-- Policy: Athletes can read their own preferences
drop policy if exists athlete_event_preferences_select_own on public.athlete_event_preferences;
create policy athlete_event_preferences_select_own
  on public.athlete_event_preferences
  for select
  using (athlete_id = auth.uid());

-- Policy: Athletes can insert their own preferences
drop policy if exists athlete_event_preferences_insert_own on public.athlete_event_preferences;
create policy athlete_event_preferences_insert_own
  on public.athlete_event_preferences
  for insert
  with check (athlete_id = auth.uid());

-- Policy: Athletes can update their own preferences
drop policy if exists athlete_event_preferences_update_own on public.athlete_event_preferences;
create policy athlete_event_preferences_update_own
  on public.athlete_event_preferences
  for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

-- Policy: Athletes can delete their own preferences
drop policy if exists athlete_event_preferences_delete_own on public.athlete_event_preferences;
create policy athlete_event_preferences_delete_own
  on public.athlete_event_preferences
  for delete
  using (athlete_id = auth.uid());

-- Policy: Public can read preferences (for displaying featured events)
drop policy if exists athlete_event_preferences_select_public on public.athlete_event_preferences;
create policy athlete_event_preferences_select_public
  on public.athlete_event_preferences
  for select
  using (true);

-- Trigger to update updated_at
create or replace function public.update_athlete_event_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists update_athlete_event_preferences_updated_at_trigger
  on public.athlete_event_preferences;
create trigger update_athlete_event_preferences_updated_at_trigger
  before update on public.athlete_event_preferences
  for each row
  execute function public.update_athlete_event_preferences_updated_at();

comment on table public.athlete_event_preferences is
'Stores athlete preferences for which events to feature on their profile and the display order.';
