-- Add visible_on_profile column to results table
-- Default to true so existing results remain visible
alter table public.results
add column if not exists visible_on_profile boolean not null default true;

-- Index for faster filtering
create index if not exists results_visible_on_profile_idx
on public.results(athlete_id, visible_on_profile)
where visible_on_profile = true;

-- Comment
comment on column public.results.visible_on_profile is
'Controls whether this result appears on the athlete''s public profile. Defaults to true.';
