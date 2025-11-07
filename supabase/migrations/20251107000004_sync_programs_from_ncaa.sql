-- ============================================
-- SYNC PROGRAMS FROM NCAA_TRACK_PROGRAMS
-- Populates programs table with all NCAA schools
-- ============================================

-- Insert all unique schools from ncaa_track_programs into programs
-- Consolidates M/W programs into single entries
INSERT INTO public.programs (name, short_name, division, sport, location_state)
SELECT DISTINCT ON (school_name)
  school_name || ' Track & Field' as name,
  school_short_name,
  division,
  'Track & Field' as sport,
  NULL as location_state  -- Not available in ncaa_track_programs
FROM public.ncaa_track_programs
WHERE sport = 'Track/XC'
  AND school_name IS NOT NULL
ORDER BY school_name, division
ON CONFLICT (name) DO UPDATE SET
  short_name = EXCLUDED.short_name,
  division = EXCLUDED.division;

-- Create index for looking up programs by ncaa school name
CREATE INDEX IF NOT EXISTS idx_programs_name_lookup ON public.programs(name text_pattern_ops);

-- Optional: Create a helper function to find program by NCAA school name
CREATE OR REPLACE FUNCTION find_program_by_ncaa_school(school text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.programs
  WHERE name = school || ' Track & Field'
  LIMIT 1;
$$;

COMMENT ON FUNCTION find_program_by_ncaa_school IS 'Helper to find program ID from NCAA school name';
