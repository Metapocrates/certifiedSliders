-- Video provider enum
do $$ begin
  create type video_provider as enum ('stream', 'bunny');
exception
  when duplicate_object then null;
end $$;

-- Video status enum
do $$ begin
  create type video_status as enum ('pending', 'processing', 'ready', 'approved', 'featured', 'rejected', 'error');
exception
  when duplicate_object then null;
end $$;

-- Video submissions table
create table if not exists public.video_submissions (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references auth.users(id) on delete cascade,

  -- Provider info
  provider video_provider not null,
  provider_asset_id text not null,

  -- Moderation status
  status video_status not null default 'pending',

  -- Metadata
  title text not null,
  description text,
  duration_seconds integer,

  -- Storage
  master_bytes bigint,
  master_r2_key text,

  -- Playback URLs
  playback_url text,
  mp4_fallback_url text,
  poster_url text,

  -- Flexible metadata for provider-specific data
  flags jsonb default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint unique_provider_asset unique (provider, provider_asset_id)
);

-- Indexes
create index if not exists video_submissions_status_idx on public.video_submissions(status);
create index if not exists video_submissions_provider_asset_idx on public.video_submissions(provider, provider_asset_id);
create index if not exists video_submissions_uploader_created_idx on public.video_submissions(uploader_id, created_at desc);

-- RLS policies
alter table public.video_submissions enable row level security;

-- Users can insert their own videos
create policy "Users can upload their own videos"
  on public.video_submissions
  for insert
  to authenticated
  with check (auth.uid() = uploader_id);

-- Public can view ready/approved/featured videos
create policy "Public can view approved videos"
  on public.video_submissions
  for select
  to public
  using (status in ('ready', 'approved', 'featured'));

-- Users can view their own videos regardless of status
create policy "Users can view their own videos"
  on public.video_submissions
  for select
  to authenticated
  using (auth.uid() = uploader_id);

-- Users can delete their own pending videos
create policy "Users can delete their own pending videos"
  on public.video_submissions
  for delete
  to authenticated
  using (auth.uid() = uploader_id and status = 'pending');

-- Admins have full access (service_role policy)
create policy "Admins have full access to videos"
  on public.video_submissions
  for all
  to authenticated
  using (
    auth.uid() in (select user_id from public.admins)
  )
  with check (
    auth.uid() in (select user_id from public.admins)
  );

-- Updated timestamp trigger
create or replace function public.trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp_video_submissions on public.video_submissions;
create trigger set_timestamp_video_submissions
  before update on public.video_submissions
  for each row
  execute function public.trigger_set_timestamp();
