-- ============================================
-- USER TYPES: Add user_type column to profiles
-- Supports: athlete, ncaa_coach, parent, hs_coach
-- ============================================

-- 1. Add user_type column to profiles (defaults to athlete for existing users)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_type text
    CHECK (user_type IN ('athlete', 'ncaa_coach', 'parent', 'hs_coach'))
    DEFAULT 'athlete' NOT NULL;

CREATE INDEX idx_profiles_user_type ON public.profiles(user_type);

COMMENT ON COLUMN public.profiles.user_type IS 'User account type: athlete | ncaa_coach | parent | hs_coach (immutable after creation)';


-- 2. RPC: Set user type (only works once, immutable after setting)
CREATE OR REPLACE FUNCTION rpc_set_user_type(_user_type text)
RETURNS TABLE (
  success boolean,
  message text,
  user_type text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_type text;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Unauthorized'::text, NULL::text;
    RETURN;
  END IF;

  -- Validate type
  IF _user_type NOT IN ('athlete', 'ncaa_coach', 'parent', 'hs_coach') THEN
    RETURN QUERY SELECT false, 'Invalid user type'::text, NULL::text;
    RETURN;
  END IF;

  -- Get current type
  SELECT user_type INTO v_current_type
  FROM public.profiles
  WHERE id = v_user_id;

  -- If type is already set to something other than 'athlete' (default), don't allow change
  IF v_current_type IS NOT NULL AND v_current_type != 'athlete' THEN
    RETURN QUERY SELECT false, 'User type already set and cannot be changed'::text, v_current_type;
    RETURN;
  END IF;

  -- Update user type
  UPDATE public.profiles
  SET user_type = _user_type
  WHERE id = v_user_id;

  RETURN QUERY SELECT true, 'User type set successfully'::text, _user_type;
END $$;

COMMENT ON FUNCTION rpc_set_user_type IS 'Set user type once (immutable after first non-athlete assignment)';


-- 3. RPC: Get user type
CREATE OR REPLACE FUNCTION rpc_get_user_type()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT user_type
  FROM public.profiles
  WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION rpc_get_user_type IS 'Get current user type';


-- 4. Feature gate helpers
CREATE OR REPLACE FUNCTION can_submit_results()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT user_type IN ('athlete', 'parent')
  FROM public.profiles
  WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION can_submit_results IS 'Check if user can submit athlete results (athletes and parents only)';


CREATE OR REPLACE FUNCTION can_access_coach_portal()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT user_type = 'ncaa_coach'
  FROM public.profiles
  WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION can_access_coach_portal IS 'Check if user can access NCAA coach portal';


-- 5. Update existing profiles - keep all as 'athlete' by default
-- (Already handled by DEFAULT 'athlete' NOT NULL above)

-- 6. Add audit logging for type changes
CREATE OR REPLACE FUNCTION log_user_type_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.user_type IS DISTINCT FROM NEW.user_type THEN
    INSERT INTO public.audit_log(actor_user_id, action, entity, entity_id, context)
    VALUES (
      auth.uid(),
      'user_type_change',
      'profile',
      NEW.id,
      jsonb_build_object(
        'old_type', OLD.user_type,
        'new_type', NEW.user_type
      )
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_user_type_change ON public.profiles;
CREATE TRIGGER trg_log_user_type_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_type_change();
