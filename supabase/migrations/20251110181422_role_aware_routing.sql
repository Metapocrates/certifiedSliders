-- ============================================
-- ROLE-AWARE ROUTING + PORTAL FOUNDATIONS
-- Adds: routing fields, parent_links, hs_staff tables
-- ============================================

-- 1. Extend profiles with routing fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_home_route text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS role_preference text
    CHECK (role_preference IN ('athlete', 'parent', 'hs_coach', 'ncaa_coach'));

CREATE INDEX IF NOT EXISTS idx_profiles_default_home_route
  ON public.profiles(default_home_route);

COMMENT ON COLUMN public.profiles.default_home_route IS 'Post-auth landing route (e.g., /parent/dashboard, /coach/portal)';
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Has user completed role-specific onboarding';
COMMENT ON COLUMN public.profiles.role_preference IS 'User''s preferred role when multiple apply';


-- 2. Parent Links (parent → athlete relationships)
CREATE TABLE IF NOT EXISTS public.parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')) DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id),
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(parent_user_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON public.parent_links(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_athlete ON public.parent_links(athlete_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_status ON public.parent_links(status);

COMMENT ON TABLE public.parent_links IS 'Links parents/guardians to athlete profiles they manage';
COMMENT ON COLUMN public.parent_links.status IS 'pending | accepted | rejected | revoked';


-- 3. HS Staff (high school coaches)
CREATE TABLE IF NOT EXISTS public.hs_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid, -- Foreign key constraint will be added once schools_highschool table exists
  school_name text,
  school_state text,
  title text, -- 'Head Coach', 'Assistant Coach', 'Athletic Director'
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  verification_method text, -- 'email_domain', 'admin_manual', 'document_upload'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hs_staff_user ON public.hs_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_hs_staff_school ON public.hs_staff(school_id);
CREATE INDEX IF NOT EXISTS idx_hs_staff_verified ON public.hs_staff(verified_at);

COMMENT ON TABLE public.hs_staff IS 'High school coaches and staff';
COMMENT ON COLUMN public.hs_staff.verified_at IS 'When coach verification was completed (NULL = pending)';


-- 4. Program Memberships - add verified_at if not exists
-- (Coach portal phase0 created this table, we're adding verified_at for role detection)
ALTER TABLE public.program_memberships
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_pm_verified ON public.program_memberships(verified_at);

COMMENT ON COLUMN public.program_memberships.verified_at IS 'When coach-program link was verified (NULL = pending)';


-- ============================================
-- RLS POLICIES
-- ============================================

-- Parent Links
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;

-- Parents can see their own links
CREATE POLICY parent_links_read_self ON public.parent_links
  FOR SELECT
  USING (parent_user_id = auth.uid());

-- Athletes can see links to their profile
CREATE POLICY parent_links_read_athlete ON public.parent_links
  FOR SELECT
  USING (
    athlete_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Parents can create links (invitations)
CREATE POLICY parent_links_insert_parent ON public.parent_links
  FOR INSERT
  WITH CHECK (parent_user_id = auth.uid());

-- Athletes can update status (accept/reject)
CREATE POLICY parent_links_update_athlete ON public.parent_links
  FOR UPDATE
  USING (
    athlete_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (status IN ('accepted', 'rejected'));

-- Admins can manage all
CREATE POLICY parent_links_admin ON public.parent_links
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );


-- HS Staff
ALTER TABLE public.hs_staff ENABLE ROW LEVEL SECURITY;

-- Staff can read their own record
CREATE POLICY hs_staff_read_self ON public.hs_staff
  FOR SELECT
  USING (user_id = auth.uid());

-- Staff can create their own record (self-signup)
CREATE POLICY hs_staff_insert_self ON public.hs_staff
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Staff can update their own non-verification fields
CREATE POLICY hs_staff_update_self ON public.hs_staff
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND verified_at IS NOT DISTINCT FROM (SELECT verified_at FROM public.hs_staff WHERE user_id = auth.uid())
  );

-- Admins can manage all
CREATE POLICY hs_staff_admin ON public.hs_staff
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );


-- User Profiles - allow users to update their own routing fields
-- (Existing RLS should allow self-updates, but let's ensure routing fields are updatable)

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Set default home route (with validation)
CREATE OR REPLACE FUNCTION rpc_set_default_home_route(_route text)
RETURNS TABLE (
  success boolean,
  message text,
  route text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  allowed_routes text[] := ARRAY[
    '/me',
    '/parent/dashboard',
    '/coach/portal',
    '/hs/portal',
    '/admin'
  ];
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Unauthorized'::text, NULL::text;
    RETURN;
  END IF;

  -- Validate route is in allow-list
  IF _route IS NOT NULL AND NOT (_route = ANY(allowed_routes)) THEN
    RETURN QUERY SELECT false, 'Invalid route'::text, NULL::text;
    RETURN;
  END IF;

  -- Update route
  UPDATE public.profiles
  SET default_home_route = _route
  WHERE id = v_user_id;

  RETURN QUERY SELECT true, 'Route updated successfully'::text, _route;
END $$;

COMMENT ON FUNCTION rpc_set_default_home_route IS 'Set user default landing route (validated against allow-list)';


-- Set role preference
CREATE OR REPLACE FUNCTION rpc_set_role_preference(_role text)
RETURNS TABLE (
  success boolean,
  message text,
  role_preference text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Unauthorized'::text, NULL::text;
    RETURN;
  END IF;

  -- Validate role
  IF _role NOT IN ('athlete', 'parent', 'hs_coach', 'ncaa_coach') THEN
    RETURN QUERY SELECT false, 'Invalid role'::text, NULL::text;
    RETURN;
  END IF;

  -- Update preference
  UPDATE public.profiles
  SET role_preference = _role
  WHERE id = v_user_id;

  RETURN QUERY SELECT true, 'Preference updated'::text, _role;
END $$;

COMMENT ON FUNCTION rpc_set_role_preference IS 'Set user role preference when multiple roles apply';


-- Mark onboarding complete
CREATE OR REPLACE FUNCTION rpc_complete_onboarding()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles
  SET onboarding_completed = true
  WHERE id = auth.uid()
  RETURNING true;
$$;

COMMENT ON FUNCTION rpc_complete_onboarding IS 'Mark role onboarding as completed for current user';


-- ============================================
-- AUDIT LOG
-- ============================================

-- Log route changes
CREATE OR REPLACE FUNCTION log_route_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.default_home_route IS DISTINCT FROM NEW.default_home_route THEN
    INSERT INTO public.audit_log(actor_user_id, action, entity, entity_id, context)
    VALUES (
      auth.uid(),
      'default_route_change',
      'profile',
      NEW.id,
      jsonb_build_object(
        'old_route', OLD.default_home_route,
        'new_route', NEW.default_home_route
      )
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_route_change ON public.profiles;
CREATE TRIGGER trg_log_route_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_route_change();
