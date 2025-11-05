-- Update mv_best_event to respect visible_on_profile setting
-- Athletes can now control which events appear on their public profile

-- WARNING: This will drop dependent views (mv_best_event_enriched, mv_rankings)
-- These views are not used in the current codebase and will need to be recreated manually if needed

-- Drop and recreate the materialized view with the visible_on_profile filter
drop materialized view if exists public.mv_best_event cascade;

create materialized view public.mv_best_event as
with ranked as (
  select
    r.id as result_id,
    r.athlete_id,
    r.event,
    p.gender,
    r.season,
    r.mark_seconds_adj as best_seconds_adj,
    r.mark as best_mark_text,
    (r.wind is not null and r.wind <= 2.0) as wind_legal,
    r.wind,
    r.meet_name,
    r.meet_date,
    r.proof_url,
    row_number() over (
      partition by r.athlete_id, r.event
      order by r.mark_seconds_adj asc nulls last
    ) as rn
  from public.results r
  join public.profiles p on p.id = r.athlete_id
  where r.status = 'verified'
    and r.visible_on_profile = true  -- Only include visible results
)
select
  result_id,
  athlete_id,
  event,
  gender,
  season,
  best_seconds_adj,
  best_mark_text,
  wind_legal,
  wind,
  meet_name,
  meet_date,
  proof_url
from ranked
where rn = 1;

-- Create indexes for common queries
-- UNIQUE index on result_id enables CONCURRENTLY refresh (non-blocking)
create unique index if not exists mv_best_event_result_id_idx on public.mv_best_event(result_id);
create index if not exists mv_best_event_athlete_id_idx on public.mv_best_event(athlete_id);
create index if not exists mv_best_event_event_gender_season_idx on public.mv_best_event(event, gender, season);
create index if not exists mv_best_event_best_seconds_adj_idx on public.mv_best_event(best_seconds_adj);

-- Grant read access
grant select on public.mv_best_event to anon, authenticated;

-- Comment explaining the view
comment on materialized view public.mv_best_event is
'Best (PR) mark per athlete per event. Only includes results where visible_on_profile = true.';
