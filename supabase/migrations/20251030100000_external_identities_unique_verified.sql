-- Allow multiple pending claims; enforce uniqueness only for verified identities

drop index if exists external_identities_provider_external_id_uniq;

create unique index external_identities_provider_external_id_verified_uniq
  on public.external_identities (provider, external_id)
  where status = 'verified' or verified = true;
