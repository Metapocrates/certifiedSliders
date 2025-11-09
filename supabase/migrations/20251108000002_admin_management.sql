-- Ensure admins table exists
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Add columns if they don't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'admins' and column_name = 'granted_by') then
    alter table public.admins add column granted_by uuid references auth.users(id);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'admins' and column_name = 'granted_at') then
    alter table public.admins add column granted_at timestamptz not null default now();
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'admins' and column_name = 'notes') then
    alter table public.admins add column notes text;
  end if;
end $$;

-- Index for efficient lookups
create index if not exists admins_granted_at_idx on public.admins (granted_at desc);

-- RLS policies
alter table public.admins enable row level security;

-- Only service role can read/write admins (handled by admin-only routes)
create policy "service_role_admins"
  on public.admins
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Allow users to check if they themselves are admin (read-only)
create policy "users_check_own_admin"
  on public.admins
  for select
  using (auth.uid() = user_id);

comment on table public.admins is 'Admin users with access to admin console';
comment on column public.admins.granted_by is 'Admin user who granted this admin access';
comment on column public.admins.notes is 'Notes about why admin access was granted';
