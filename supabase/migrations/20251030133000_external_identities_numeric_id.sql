alter table if exists public.external_identities
  add column if not exists external_numeric_id text;

-- Ensure verified profiles remain unique by slug and numeric id
create unique index if not exists external_identities_provider_numeric_verified_uniq
  on public.external_identities (provider, external_numeric_id)
  where (status = 'verified' or verified = true) and external_numeric_id is not null;
