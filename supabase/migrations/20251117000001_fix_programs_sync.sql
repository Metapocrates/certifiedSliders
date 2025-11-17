-- ============================================
-- FIX: SYNC PROGRAMS FROM NCAA_TRACK_PROGRAMS
-- Fixes the sport filter to match actual data
-- ============================================

-- The original migration used WHERE sport = 'Track/XC'
-- but the actual data has 'Indoor Track & Field', 'Outdoor Track & Field', 'Cross Country'
-- This migration re-syncs with the correct filter

INSERT INTO public.programs (name, short_name, division, sport, location_state, is_active)
SELECT DISTINCT ON (school_name)
  school_name || ' Track & Field' as name,
  school_short_name,
  division,
  'Track & Field' as sport,
  NULL as location_state,
  true as is_active
FROM public.ncaa_track_programs
WHERE sport IN ('Indoor Track & Field', 'Outdoor Track & Field', 'Cross Country')
  AND school_name IS NOT NULL
ORDER BY school_name, division
ON CONFLICT (name) DO UPDATE SET
  short_name = EXCLUDED.short_name,
  division = EXCLUDED.division,
  is_active = EXCLUDED.is_active;

COMMENT ON TABLE public.programs IS 'Synced from ncaa_track_programs - contains all NCAA Track & Field programs';
