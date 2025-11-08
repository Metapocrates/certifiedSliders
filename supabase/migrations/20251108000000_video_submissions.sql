-- Video provider enum
create type video_provider as enum ('stream', 'bunny');

-- Video submissions table
create table public.video_submissions (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references auth.users(id) on delete cascade,
  provider video_provider not null default 'stream',
  provider_asset_id text,           -- Stream video UID or Bunny video ID
  title text,
  description text,
  status text not null default 'pending' check (status in ('pending','ready','approved','featured','rejected','taken_down')),
  duration_seconds int,
  master_bytes bigint,
  master_r2_key text,               -- R2 object key to original/master
  playback_url text,                -- HLS/DASH URL (provider)
  mp4_fallback_url text,
  poster_url text,
  flags jsonb default '{}'::jsonb,  -- event metadata, captions, etc.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger for updated_at (assumes trigger_set_timestamp function exists)
create trigger set_video_timestamp before update on public.video_submissions
for each row execute procedure public.trigger_set_timestamp();

-- Indexes
create index video_submissions_status_idx on public.video_submissions (status);
create index video_submissions_provider_asset_idx on public.video_submissions (provider, provider_asset_id);
create index video_submissions_uploader_created_idx on public.video_submissions (uploader_id, created_at desc);

-- RLS
alter table public.video_submissions enable row level security;

-- Policy: Users can insert their own videos
create policy "users_insert_own_videos"
  on public.video_submissions
  for insert
  with check (auth.uid() = uploader_id);

-- Policy: Read approved/featured videos or own videos
create policy "read_public_or_owner_videos"
  on public.video_submissions
  for select
  using (
    status in ('ready','approved','featured')
    or uploader_id = auth.uid()
  );

-- Policy: Users can delete their own pending videos
create policy "owner_delete_pending_videos"
  on public.video_submissions
  for delete
  using (uploader_id = auth.uid() and status = 'pending');

-- Policy: Service role has full access (admin operations)
create policy "service_role_all_videos"
  on public.video_submissions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Comment
comment on table public.video_submissions is 'Multi-provider video submissions with approval workflow';
