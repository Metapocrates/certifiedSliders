-- Create follows table
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  -- Prevent following yourself
  constraint no_self_follow check (follower_id != followed_id),

  -- Unique constraint to prevent duplicate follows
  constraint unique_follow unique (follower_id, followed_id)
);

-- Indexes for performance
create index follows_follower_id_idx on public.follows(follower_id);
create index follows_followed_id_idx on public.follows(followed_id);
create index follows_created_at_idx on public.follows(created_at desc);

-- RLS policies
alter table public.follows enable row level security;

-- Anyone can see who follows whom (public follows)
create policy "Follows are publicly viewable"
  on public.follows for select
  using (true);

-- Users can follow others (insert their own follows)
create policy "Users can follow others"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

-- Users can unfollow (delete their own follows)
create policy "Users can unfollow"
  on public.follows for delete
  to authenticated
  using (auth.uid() = follower_id);

-- Comment for documentation
comment on table public.follows is 'Tracks athlete-to-athlete follows for activity feed';
