-- Normalize existing profile state abbreviations and enforce 2-letter codes

update public.profiles
set school_state = upper(trim(school_state))
where school_state is not null;

update public.profiles
set school_state = null
where school_state is not null
  and school_state !~ '^[A-Z]{2}$';

alter table public.profiles
  drop constraint if exists profiles_school_state_check;

alter table public.profiles
  add constraint profiles_school_state_check
  check (school_state is null or school_state ~ '^[A-Z]{2}$');
