-- ============================================
-- FIX: Infinite recursion in athlete_college_interests RLS
-- The aci_limit_10_programs policy was querying the same table,
-- causing infinite recursion. Replace with SECURITY DEFINER function.
-- ============================================

-- 1. Drop the problematic policy
DROP POLICY IF EXISTS aci_limit_10_programs ON public.athlete_college_interests;

-- 2. Create a SECURITY DEFINER function to count interests (bypasses RLS)
CREATE OR REPLACE FUNCTION count_athlete_interests(_athlete_id uuid)
RETURNS int LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COUNT(*)::int
  FROM public.athlete_college_interests
  WHERE athlete_id = _athlete_id
    AND intent IN ('interested', 'commit')
    AND program_id IS NOT NULL;
$$;

COMMENT ON FUNCTION count_athlete_interests IS 'Count active program interests for an athlete (bypasses RLS to avoid recursion)';

-- 3. Create new policy using the function
CREATE POLICY aci_limit_10_programs ON public.athlete_college_interests
  FOR INSERT
  WITH CHECK (
    count_athlete_interests(athlete_id) < 10
  );

COMMENT ON POLICY aci_limit_10_programs ON public.athlete_college_interests IS 'Limit athletes to 10 active program interests';
