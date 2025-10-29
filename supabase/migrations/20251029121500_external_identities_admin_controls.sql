-- Allow admins to manage all external identities for testing/support flows

alter table if exists public.external_identities enable row level security;

drop policy if exists ext_ids_admin_select on public.external_identities;
create policy ext_ids_admin_select
  on public.external_identities
  for select
  using (
    exists (
      select 1
      from public.admins
      where user_id = auth.uid()
    )
  );

drop policy if exists ext_ids_admin_update on public.external_identities;
create policy ext_ids_admin_update
  on public.external_identities
  for update
  using (
    exists (
      select 1
      from public.admins
      where user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.admins
      where user_id = auth.uid()
    )
  );

drop policy if exists ext_ids_admin_delete on public.external_identities;
create policy ext_ids_admin_delete
  on public.external_identities
  for delete
  using (
    exists (
      select 1
      from public.admins
      where user_id = auth.uid()
    )
  );
