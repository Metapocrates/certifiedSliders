-- ============================================
-- PHASE 1: ATHLETE PORTAL ENHANCEMENTS
-- Profile fields, social links, featured events
-- ============================================

-- 1. Add new profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS featured_events text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS headshot_url text;

CREATE INDEX IF NOT EXISTS idx_profiles_featured_events ON public.profiles USING GIN (featured_events);

COMMENT ON COLUMN public.profiles.featured_events IS 'Array of event codes that athlete wants to highlight (e.g., ["400m", "800m"])';
COMMENT ON COLUMN public.profiles.social_links IS 'Social media links: {instagram, tiktok, youtube, twitter, etc.}';
COMMENT ON COLUMN public.profiles.headshot_url IS 'Professional headshot URL (separate from profile_pic_url)';


-- 2. Add PR tracking column to results table
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS is_pr boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_results_pr ON public.results(athlete_id, event, is_pr) WHERE is_pr = true;

COMMENT ON COLUMN public.results.is_pr IS 'True if this is the athlete personal record for this event at time of creation';


-- 3. Function to update PR flags when new result is added
CREATE OR REPLACE FUNCTION update_pr_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark current result as PR if it's the best for this athlete/event
  UPDATE public.results
  SET is_pr = (
    id = (
      SELECT id
      FROM public.results r
      WHERE r.athlete_id = NEW.athlete_id
        AND r.event = NEW.event
        AND r.status IN ('verified', 'approved')
      ORDER BY
        CASE
          WHEN r.mark_seconds_adj IS NOT NULL THEN r.mark_seconds_adj
          ELSE 999999
        END ASC,
        r.meet_date DESC
      LIMIT 1
    )
  )
  WHERE athlete_id = NEW.athlete_id
    AND event = NEW.event
    AND status IN ('verified', 'approved');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_pr_flags ON public.results;
CREATE TRIGGER trigger_update_pr_flags
AFTER INSERT OR UPDATE ON public.results
FOR EACH ROW
EXECUTE FUNCTION update_pr_flags();

COMMENT ON FUNCTION update_pr_flags IS 'Automatically updates is_pr flag for all results when new result is added';


-- 4. RPC: Get athlete PRs by event
CREATE OR REPLACE FUNCTION rpc_get_athlete_prs(_athlete_id uuid)
RETURNS TABLE (
  event text,
  mark_text text,
  mark_seconds numeric,
  meet_name text,
  meet_date date,
  season text,
  proof_url text,
  result_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT ON (r.event)
    r.event,
    COALESCE(r.mark_text, r.mark_seconds::text) as mark_text,
    r.mark_seconds,
    r.meet_name,
    r.meet_date,
    r.season,
    r.proof_url,
    r.status as result_status
  FROM public.results r
  WHERE r.athlete_id = _athlete_id
    AND r.status IN ('verified', 'approved')
    AND r.is_pr = true
  ORDER BY r.event, r.mark_seconds ASC NULLS LAST, r.meet_date DESC;
$$;

COMMENT ON FUNCTION rpc_get_athlete_prs IS 'Get personal records for an athlete across all events';


-- 5. RPC: Get athlete results history for a specific event
CREATE OR REPLACE FUNCTION rpc_get_athlete_event_history(
  _athlete_id uuid,
  _event text,
  _season text DEFAULT NULL
)
RETURNS TABLE (
  result_id bigint,
  mark_text text,
  mark_seconds numeric,
  meet_name text,
  meet_date date,
  season text,
  proof_url text,
  result_status text,
  is_pr boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    r.id as result_id,
    COALESCE(r.mark_text, r.mark_seconds::text) as mark_text,
    r.mark_seconds,
    r.meet_name,
    r.meet_date,
    r.season,
    r.proof_url,
    r.status as result_status,
    r.is_pr,
    r.created_at
  FROM public.results r
  WHERE r.athlete_id = _athlete_id
    AND r.event = _event
    AND r.status IN ('verified', 'approved', 'pending')
    AND (_season IS NULL OR r.season = _season)
  ORDER BY r.meet_date DESC NULLS LAST, r.created_at DESC;
$$;

COMMENT ON FUNCTION rpc_get_athlete_event_history IS 'Get all results for a specific event, optionally filtered by season';


-- 6. Add social links validation function
CREATE OR REPLACE FUNCTION validate_social_links(links jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Ensure it's an object
  IF jsonb_typeof(links) != 'object' THEN
    RETURN false;
  END IF;

  -- All values must be strings or null
  IF EXISTS (
    SELECT 1
    FROM jsonb_each(links) AS kv
    WHERE jsonb_typeof(kv.value) NOT IN ('string', 'null')
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION validate_social_links IS 'Validates that social_links is a valid JSON object with string values';


-- 7. Add constraint for social links validation
ALTER TABLE public.profiles
  ADD CONSTRAINT check_social_links_format
  CHECK (social_links IS NULL OR validate_social_links(social_links));


-- 8. RPC: Update athlete social links
CREATE OR REPLACE FUNCTION rpc_update_social_links(_links jsonb)
RETURNS TABLE (
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Validate format
  IF NOT validate_social_links(_links) THEN
    RETURN QUERY SELECT false, 'Invalid social links format'::text;
    RETURN;
  END IF;

  -- Update links
  UPDATE public.profiles
  SET social_links = _links,
      updated_at = now()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Profile not found'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Social links updated successfully'::text;
END;
$$;

COMMENT ON FUNCTION rpc_update_social_links IS 'Update athlete social media links with validation';


-- 9. RPC: Update featured events
CREATE OR REPLACE FUNCTION rpc_update_featured_events(_events text[])
RETURNS TABLE (
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Limit to 5 featured events
  IF array_length(_events, 1) > 5 THEN
    RETURN QUERY SELECT false, 'Maximum 5 featured events allowed'::text;
    RETURN;
  END IF;

  -- Update featured events
  UPDATE public.profiles
  SET featured_events = _events,
      updated_at = now()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Profile not found'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Featured events updated successfully'::text;
END;
$$;

COMMENT ON FUNCTION rpc_update_featured_events IS 'Update athlete featured events (max 5)';
