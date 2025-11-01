create table if not exists public.results_submissions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    provider text not null check (provider = 'athleticnet'),
    external_id text not null,
    mode text not null check (mode in ('two_link','bookmarklet','manual')),
    status text not null check (status in ('pending','accepted','rejected','needs_review')) default 'pending',
    profile_url text,
    result_url text,
    context_url text,
    page_snapshot_hash text,
    payload jsonb,
    reason text,
    created_at timestamptz not null default timezone('utc', now()),
    decided_at timestamptz
);

create index if not exists results_submissions_user_idx
  on public.results_submissions (user_id, status);

create index if not exists results_submissions_mode_idx
  on public.results_submissions (mode);

alter table public.results_submissions enable row level security;

drop policy if exists "Users manage their submissions" on public.results_submissions;
create policy "Users manage their submissions"
  on public.results_submissions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
