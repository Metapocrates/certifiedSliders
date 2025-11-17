-- ============================================
-- COACH PORTAL: ANALYTICS MATERIALIZED VIEW
-- Premium feature: Aggregated stats for programs
-- ============================================

-- 1. Create analytics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_coach_analytics AS
SELECT
  aci.program_id,
  p.class_year,
  COUNT(DISTINCT aci.athlete_id)::int as interested_count,
  COUNT(DISTINCT CASE WHEN p.star_rating >= 4 THEN aci.athlete_id END)::int as high_star_count,
  COUNT(DISTINCT CASE WHEN p.verified_at IS NOT NULL THEN aci.athlete_id END)::int as verified_count,
  COUNT(DISTINCT CASE WHEN aci.intent = 'commit' THEN aci.athlete_id END)::int as commit_count,
  COUNT(DISTINCT CASE WHEN p.school_state IS NOT NULL THEN p.school_state END)::int as states_count,
  COUNT(DISTINCT CASE WHEN aci.share_contact = true THEN aci.athlete_id END)::int as shared_contact_count
FROM public.athlete_college_interests aci
JOIN public.profiles p ON p.id = aci.athlete_id
WHERE aci.intent IN ('interested', 'commit')
  AND aci.program_id IS NOT NULL
GROUP BY aci.program_id, p.class_year;

-- Create unique index on program_id + class_year for fast refreshes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_analytics_program_class
  ON public.mv_coach_analytics(program_id, class_year);

-- Index for queries by program
CREATE INDEX IF NOT EXISTS idx_mv_analytics_program
  ON public.mv_coach_analytics(program_id);

COMMENT ON MATERIALIZED VIEW public.mv_coach_analytics IS 'Aggregated analytics for coach portal (premium feature)';


-- 2. Create refresh function (to be called by cron or manually)
CREATE OR REPLACE FUNCTION refresh_coach_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_coach_analytics;
END;
$$;

COMMENT ON FUNCTION refresh_coach_analytics IS 'Refresh analytics view. Run nightly or on-demand.';


-- 3. RPC function to get analytics for a program (with tier check)
CREATE OR REPLACE FUNCTION rpc_get_program_analytics(_program_id uuid)
RETURNS TABLE (
  class_year int,
  interested_count int,
  high_star_count int,
  verified_count int,
  commit_count int,
  states_count int,
  shared_contact_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if caller has access to this program
  IF NOT EXISTS (
    SELECT 1 FROM public.program_memberships
    WHERE program_id = _program_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: you are not a member of this program';
  END IF;

  -- Check if analytics is enabled for this program (premium feature)
  IF NOT COALESCE(
    (
      SELECT (features->>'analytics_enabled')::boolean
      FROM public.program_entitlements
      WHERE program_entitlements.program_id = _program_id
    ),
    false
  ) THEN
    RAISE EXCEPTION 'Analytics is not enabled for this program. Upgrade to Premium to access analytics.';
  END IF;

  -- Return analytics data
  RETURN QUERY
  SELECT
    a.class_year,
    a.interested_count,
    a.high_star_count,
    a.verified_count,
    a.commit_count,
    a.states_count,
    a.shared_contact_count
  FROM public.mv_coach_analytics a
  WHERE a.program_id = _program_id
  ORDER BY a.class_year DESC;
END;
$$;

COMMENT ON FUNCTION rpc_get_program_analytics IS 'Get analytics for a program (premium-gated)';


-- 4. RPC function to get overall stats summary for a program
CREATE OR REPLACE FUNCTION rpc_get_program_stats_summary(_program_id uuid)
RETURNS TABLE (
  total_interested int,
  total_commits int,
  total_verified int,
  total_high_stars int,
  avg_star_rating numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if caller has access to this program
  IF NOT EXISTS (
    SELECT 1 FROM public.program_memberships
    WHERE program_id = _program_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: you are not a member of this program';
  END IF;

  -- Return summary stats
  RETURN QUERY
  SELECT
    COUNT(DISTINCT aci.athlete_id)::int as total_interested,
    COUNT(DISTINCT CASE WHEN aci.intent = 'commit' THEN aci.athlete_id END)::int as total_commits,
    COUNT(DISTINCT CASE WHEN p.verified_at IS NOT NULL THEN aci.athlete_id END)::int as total_verified,
    COUNT(DISTINCT CASE WHEN p.star_rating >= 4 THEN aci.athlete_id END)::int as total_high_stars,
    ROUND(AVG(p.star_rating), 2) as avg_star_rating
  FROM public.athlete_college_interests aci
  JOIN public.profiles p ON p.id = aci.athlete_id
  WHERE aci.program_id = _program_id
    AND aci.intent IN ('interested', 'commit');
END;
$$;

COMMENT ON FUNCTION rpc_get_program_stats_summary IS 'Get overall stats summary for a program (available to all tiers)';


-- 5. RLS for materialized view (read-only, coaches can see their programs' data)
ALTER MATERIALIZED VIEW public.mv_coach_analytics OWNER TO postgres;

-- Note: Materialized views don't support RLS directly, so we gate access via RPC functions


-- 6. Initial refresh
REFRESH MATERIALIZED VIEW public.mv_coach_analytics;
