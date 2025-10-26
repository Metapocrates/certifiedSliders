alter table public.schools_highschool
  drop constraint if exists schools_highschool_state_city_name_address_unique;

create unique index if not exists idx_schools_highschool_state_city_name_address
  on public.schools_highschool (state, city_norm, school_name_norm, coalesce(address_norm, ''));
