-- ============================================
-- PHASE 1: ATHLETE INTEREST LIST ENHANCEMENTS
-- Dream school flags, swap cooldown, 10-program limit
-- ============================================

-- 1. Add new columns to athlete_college_interests
ALTER TABLE public.athlete_college_interests
  ADD COLUMN IF NOT EXISTS is_dream_school boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_modified_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_athlete_college_interests_dream
  ON public.athlete_college_interests(athlete_id, is_dream_school)
  WHERE is_dream_school = true;

COMMENT ON COLUMN public.athlete_college_interests.is_dream_school IS 'True if this is marked as a dream school (max 2 per athlete)';
COMMENT ON COLUMN public.athlete_college_interests.last_modified_at IS 'Last time this entry was modified (for cooldown enforcement)';


-- 2. Function to enforce dream school limit (max 2)
CREATE OR REPLACE FUNCTION check_dream_school_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  dream_count int;
BEGIN
  IF NEW.is_dream_school = true THEN
    SELECT COUNT(*)
    INTO dream_count
    FROM public.athlete_college_interests
    WHERE athlete_id = NEW.athlete_id
      AND is_dream_school = true
      AND id != COALESCE(NEW.id, gen_random_uuid()); -- Exclude current record for updates

    IF dream_count >= 2 THEN
      RAISE EXCEPTION 'Maximum 2 dream schools allowed per athlete';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_dream_school_limit ON public.athlete_college_interests;
CREATE TRIGGER trigger_check_dream_school_limit
BEFORE INSERT OR UPDATE ON public.athlete_college_interests
FOR EACH ROW
EXECUTE FUNCTION check_dream_school_limit();


-- 3. Function to enforce total college limit (max 10)
CREATE OR REPLACE FUNCTION check_college_interests_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  total_count int;
BEGIN
  SELECT COUNT(*)
  INTO total_count
  FROM public.athlete_college_interests
  WHERE athlete_id = NEW.athlete_id
    AND id != COALESCE(NEW.id, gen_random_uuid()); -- Exclude current record for updates

  IF total_count >= 10 THEN
    RAISE EXCEPTION 'Maximum 10 college interests allowed per athlete';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_college_interests_limit ON public.athlete_college_interests;
CREATE TRIGGER trigger_check_college_interests_limit
BEFORE INSERT ON public.athlete_college_interests
FOR EACH ROW
EXECUTE FUNCTION check_college_interests_limit();


-- 4. Function to enforce 14-day cooldown on modifications
CREATE OR REPLACE FUNCTION check_college_interests_cooldown()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  days_since_last_change int;
  last_change_date timestamptz;
BEGIN
  -- Only check cooldown for updates (not inserts or deletes)
  IF TG_OP = 'UPDATE' THEN
    -- Check if the college_name is actually changing
    IF OLD.college_name != NEW.college_name THEN
      SELECT EXTRACT(DAY FROM (now() - OLD.last_modified_at))
      INTO days_since_last_change;

      IF days_since_last_change < 14 THEN
        RAISE EXCEPTION 'Must wait 14 days between college interest changes. Last change was % days ago.', days_since_last_change;
      END IF;

      -- Update the last_modified_at timestamp
      NEW.last_modified_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_college_interests_cooldown ON public.athlete_college_interests;
CREATE TRIGGER trigger_check_college_interests_cooldown
BEFORE UPDATE ON public.athlete_college_interests
FOR EACH ROW
EXECUTE FUNCTION check_college_interests_cooldown();


-- 5. RPC: Toggle dream school status
CREATE OR REPLACE FUNCTION rpc_toggle_dream_school(_interest_id uuid, _is_dream boolean)
RETURNS TABLE (
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_athlete_id uuid;
  v_dream_count int;
BEGIN
  -- Verify ownership
  SELECT athlete_id INTO v_athlete_id
  FROM public.athlete_college_interests
  WHERE id = _interest_id;

  IF v_athlete_id IS NULL THEN
    RETURN QUERY SELECT false, 'Interest not found'::text;
    RETURN;
  END IF;

  IF v_athlete_id != v_user_id THEN
    RETURN QUERY SELECT false, 'Not authorized'::text;
    RETURN;
  END IF;

  -- Check dream school limit if setting to true
  IF _is_dream = true THEN
    SELECT COUNT(*)
    INTO v_dream_count
    FROM public.athlete_college_interests
    WHERE athlete_id = v_user_id
      AND is_dream_school = true
      AND id != _interest_id;

    IF v_dream_count >= 2 THEN
      RETURN QUERY SELECT false, 'Maximum 2 dream schools allowed'::text;
      RETURN;
    END IF;
  END IF;

  -- Update the dream school status
  UPDATE public.athlete_college_interests
  SET is_dream_school = _is_dream
  WHERE id = _interest_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Update failed'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Dream school status updated'::text;
END;
$$;

COMMENT ON FUNCTION rpc_toggle_dream_school IS 'Toggle dream school flag for a college interest (max 2 per athlete)';


-- 6. RPC: Get athlete college interests with metadata
CREATE OR REPLACE FUNCTION rpc_get_college_interests(_athlete_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  college_name text,
  is_dream_school boolean,
  created_at timestamptz,
  last_modified_at timestamptz,
  can_modify boolean,
  days_until_modifiable int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_target_athlete_id uuid;
BEGIN
  -- Use provided athlete_id or default to current user
  v_target_athlete_id := COALESCE(_athlete_id, v_user_id);

  RETURN QUERY
  SELECT
    aci.id,
    aci.college_name,
    aci.is_dream_school,
    aci.created_at,
    aci.last_modified_at,
    (EXTRACT(DAY FROM (now() - aci.last_modified_at)) >= 14) as can_modify,
    GREATEST(0, 14 - EXTRACT(DAY FROM (now() - aci.last_modified_at))::int) as days_until_modifiable
  FROM public.athlete_college_interests aci
  WHERE aci.athlete_id = v_target_athlete_id
  ORDER BY aci.is_dream_school DESC, aci.created_at ASC;
END;
$$;

COMMENT ON FUNCTION rpc_get_college_interests IS 'Get college interests with cooldown metadata';
