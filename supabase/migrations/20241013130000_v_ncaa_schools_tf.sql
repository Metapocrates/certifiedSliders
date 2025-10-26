create or replace view public.v_ncaa_schools_tf as
with base as (
  select
    school_name,
    min(nullif(school_short_name, '')) as school_short_name,
    min(division) as division,
    min(nullif(conference, '')) as conference,
    max((sport = 'Indoor Track & Field' and gender = 'M')::int)::int as men_indoor_tf,
    max((sport = 'Indoor Track & Field' and gender = 'W')::int)::int as women_indoor_tf,
    max((sport = 'Outdoor Track & Field' and gender = 'M')::int)::int as men_outdoor_tf,
    max((sport = 'Outdoor Track & Field' and gender = 'W')::int)::int as women_outdoor_tf,
    max((sport = 'Cross Country' and gender = 'M')::int)::int as men_cross_country,
    max((sport = 'Cross Country' and gender = 'W')::int)::int as women_cross_country
  from public.ncaa_track_programs
  group by school_name
)
select
  school_name,
  coalesce(school_short_name, school_name) as school_short_name,
  division,
  coalesce(conference, '') as conference,
  (men_indoor_tf = 1) as men_indoor_tf,
  (women_indoor_tf = 1) as women_indoor_tf,
  (men_outdoor_tf = 1) as men_outdoor_tf,
  (women_outdoor_tf = 1) as women_outdoor_tf,
  (men_cross_country = 1) as men_cross_country,
  (women_cross_country = 1) as women_cross_country,
  trim(both '-' from regexp_replace(lower(school_name), '[^a-z0-9]+', '-', 'g')) as school_slug
from base
order by school_name;
