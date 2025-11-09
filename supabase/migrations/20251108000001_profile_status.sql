-- Profile status enum
create type profile_status as enum ('active', 'archived', 'deleted', 'suspended');

-- Add status column to profiles table
alter table public.profiles
add column if not exists status profile_status not null default 'active';

-- Add status change audit columns
alter table public.profiles
add column if not exists status_changed_at timestamptz,
add column if not exists status_changed_by uuid references auth.users(id),
add column if not exists status_reason text;

-- Index for status filtering
create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_status_created_idx on public.profiles (status, created_at desc);

-- Function to track status changes
create or replace function public.track_profile_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    new.status_changed_at = now();
    -- status_changed_by should be set by the application
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update status change timestamp
drop trigger if exists track_profile_status on public.profiles;
create trigger track_profile_status
  before update on public.profiles
  for each row
  execute procedure public.track_profile_status_change();

-- Update existing RLS policies to filter by status
-- Drop existing public read policy if it exists
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "read_public_or_owner_videos" on public.profiles;

-- Recreate with status filter
create policy "Active profiles are publicly viewable"
  on public.profiles
  for select
  using (
    status = 'active'
    and profile_id is not null
  );

-- Allow users to see their own profile regardless of status
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Update athlete search to only show active profiles (handled in query)
-- Update materialized views if needed (they should already filter by profile_id not null)

comment on column public.profiles.status is 'Profile lifecycle status: active (public), archived (hidden but preserved), deleted (soft delete), suspended (TOS violation)';
comment on column public.profiles.status_changed_at is 'Timestamp of last status change';
comment on column public.profiles.status_changed_by is 'Admin user who changed the status';
comment on column public.profiles.status_reason is 'Reason for status change (moderation notes)';
