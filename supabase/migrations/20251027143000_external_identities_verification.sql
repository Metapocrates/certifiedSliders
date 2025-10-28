-- External identities verification enhancements for Athletic.net linking

alter table if exists public.external_identities
  add column if not exists nonce text,
  add column if not exists status text default 'pending' not null
    check (status in ('pending', 'verified', 'rejected', 'failed', 'expired')),
  add column if not exists verified boolean default false not null,
  add column if not exists verified_at timestamptz,
  add column if not exists is_primary boolean default false not null,
  add column if not exists last_checked_at timestamptz,
  add column if not exists attempts integer default 0 not null,
  add column if not exists error_text text;

-- Allow multiple identities per user but prevent cross-user conflicts
alter table if exists public.external_identities
  drop constraint if exists external_identities_provider_user_id_key;

drop index if exists external_identities_provider_user_id_idx;

create unique index if not exists external_identities_provider_external_id_uniq
  on public.external_identities (provider, external_id);

create index if not exists external_identities_user_provider_idx
  on public.external_identities (user_id, provider);

create index if not exists external_identities_verified_idx
  on public.external_identities (provider, verified)
  where provider = 'athleticnet';

-- RLS: owner access (enable if not already)
alter table if exists public.external_identities enable row level security;

drop policy if exists ext_ids_select_self on public.external_identities;
create policy ext_ids_select_self
  on public.external_identities
  for select
  using (user_id = auth.uid());

drop policy if exists ext_ids_insert_self on public.external_identities;
create policy ext_ids_insert_self
  on public.external_identities
  for insert
  with check (user_id = auth.uid());
