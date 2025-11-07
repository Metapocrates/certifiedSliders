-- ============================================
-- COACH PORTAL PHASE 0: FOUNDATIONS
-- Reuses: profiles, results, athlete_college_interests
-- Creates: programs, program_memberships, audit_log
-- ============================================

-- 1. Programs (NEW - college track & field programs)
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,  -- "Stanford Track & Field"
  short_name text,             -- "Stanford"
  division text,               -- "NCAA D1", "NCAA D2", "NCAA D3", "NAIA", "NJCAA"
  sport text NOT NULL DEFAULT 'Track & Field',
  domain text,                 -- "stanford.edu" for email verification
  logo_url text,               -- For coach portal branding
  location_city text,
  location_state text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_programs_name ON public.programs(name);
CREATE INDEX idx_programs_domain ON public.programs(domain);
CREATE INDEX idx_programs_division ON public.programs(division);

COMMENT ON TABLE public.programs IS 'College track & field programs that coaches represent';
COMMENT ON COLUMN public.programs.domain IS 'Primary domain for email verification (e.g., stanford.edu)';


-- 2. Program Memberships (NEW - links coaches to programs)
CREATE TABLE IF NOT EXISTS public.program_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('coach','coordinator','admin')) DEFAULT 'coach',
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(program_id, user_id)
);

CREATE INDEX idx_pm_program ON public.program_memberships(program_id);
CREATE INDEX idx_pm_user ON public.program_memberships(user_id);

COMMENT ON TABLE public.program_memberships IS 'Links coaches to programs they can access';


-- 3. Extend athlete_college_interests (EXISTING TABLE - add columns)
-- This table already stores athlete → college relationships
-- We extend it to support structured program references

ALTER TABLE public.athlete_college_interests
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS intent text CHECK (intent IN ('interested','commit','no_interest')) DEFAULT 'interested',
  ADD COLUMN IF NOT EXISTS share_contact boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS share_email boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_phone boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS note text;

-- Create indexes for coach portal queries
CREATE INDEX IF NOT EXISTS idx_aci_program ON public.athlete_college_interests(program_id)
  WHERE program_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aci_intent ON public.athlete_college_interests(intent);
CREATE INDEX IF NOT EXISTS idx_aci_athlete_program ON public.athlete_college_interests(athlete_id, program_id);

COMMENT ON COLUMN public.athlete_college_interests.program_id IS 'FK to programs table (replaces freeform college_name)';
COMMENT ON COLUMN public.athlete_college_interests.intent IS 'interested | commit | no_interest';
COMMENT ON COLUMN public.athlete_college_interests.share_contact IS 'Gate for showing any contact info to coaches';


-- 4. Audit Log (NEW - optional but recommended)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,  -- 'coach_export_csv', 'athlete_express_interest', etc.
  entity text,           -- 'program', 'athlete', 'result', etc.
  entity_id uuid,
  context jsonb,         -- Additional metadata
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_actor ON public.audit_log(actor_user_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_entity ON public.audit_log(entity, entity_id);

COMMENT ON TABLE public.audit_log IS 'Tracks sensitive actions (exports, tier changes, etc.)';


-- ============================================
-- RLS POLICIES
-- ============================================

-- Programs: readable by all authenticated users (for browsing/selection)
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY programs_read_all ON public.programs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can modify programs
CREATE POLICY programs_admin_write ON public.programs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );


-- Program Memberships: users can see their own memberships
ALTER TABLE public.program_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY pm_read_self ON public.program_memberships
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own memberships (self-signup)
-- In production, you may want admin-only or invite-based
CREATE POLICY pm_insert_self ON public.program_memberships
  FOR INSERT
  WITH CHECK (user_id = auth.uid());


-- Athlete College Interests: extend existing policies
ALTER TABLE public.athlete_college_interests ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies first (if needed)
DROP POLICY IF EXISTS aci_athlete_manage ON public.athlete_college_interests;
DROP POLICY IF EXISTS aci_coach_read ON public.athlete_college_interests;
DROP POLICY IF EXISTS aci_athlete_full_control ON public.athlete_college_interests;
DROP POLICY IF EXISTS aci_coach_read_own_program ON public.athlete_college_interests;
DROP POLICY IF EXISTS aci_limit_10_programs ON public.athlete_college_interests;

-- Athletes can manage their own interests
CREATE POLICY aci_athlete_full_control ON public.athlete_college_interests
  FOR ALL
  USING (
    athlete_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    athlete_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Coaches can READ interests for their programs only
CREATE POLICY aci_coach_read_own_program ON public.athlete_college_interests
  FOR SELECT
  USING (
    program_id IN (
      SELECT program_id FROM public.program_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Limit athletes to 10 program interests
CREATE POLICY aci_limit_10_programs ON public.athlete_college_interests
  FOR INSERT
  WITH CHECK (
    (
      SELECT COUNT(*)
      FROM public.athlete_college_interests aci
      WHERE aci.athlete_id = athlete_college_interests.athlete_id
        AND aci.intent IN ('interested', 'commit')
        AND aci.program_id IS NOT NULL
    ) < 10
  );


-- Audit Log: insert for authenticated users, read for admins only
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_insert_authenticated ON public.audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY audit_read_admin_only ON public.audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );


-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Main query: List athletes who expressed interest, ranked by stars/verification
CREATE OR REPLACE FUNCTION rpc_list_interested_athletes(
  _program_id uuid,
  _class_year int DEFAULT NULL,
  _event_code text DEFAULT NULL,
  _only_verified boolean DEFAULT FALSE,
  _search_name text DEFAULT NULL,
  _state_code text DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
) RETURNS TABLE (
  athlete_id uuid,
  profile_id text,
  full_name text,
  class_year int,
  state_code text,
  school_name text,
  star_tier int,
  profile_verified boolean,
  most_recent_pb_date date,
  top_event text,
  top_mark text,
  intent text,
  share_contact boolean,
  interest_created_at timestamptz
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  WITH athlete_best_marks AS (
    SELECT DISTINCT ON (r.athlete_id)
      r.athlete_id,
      r.event as top_event,
      r.mark as top_mark,
      r.meet_date
    FROM public.results r
    WHERE r.status IN ('verified', 'approved')
    ORDER BY r.athlete_id, r.mark_seconds_adj ASC NULLS LAST, r.meet_date DESC
  )
  SELECT
    p.id,
    p.profile_id,
    p.full_name,
    p.class_year,
    p.school_state,
    p.school_name,
    COALESCE(p.star_rating, 0),
    EXISTS(
      SELECT 1 FROM public.external_identities ei
      WHERE ei.user_id = p.id
        AND ei.verified = true
    ) as profile_verified,
    (
      SELECT MAX(meet_date)
      FROM public.results r
      WHERE r.athlete_id = p.id
        AND r.status IN ('verified', 'approved')
    ) as most_recent_pb_date,
    bm.top_event,
    bm.top_mark,
    aci.intent,
    aci.share_contact,
    aci.created_at
  FROM public.athlete_college_interests aci
  JOIN public.profiles p ON p.id = aci.athlete_id
  LEFT JOIN athlete_best_marks bm ON bm.athlete_id = p.id
  WHERE aci.program_id = _program_id
    AND aci.intent IN ('interested', 'commit')
    AND (_class_year IS NULL OR p.class_year = _class_year)
    AND (_state_code IS NULL OR p.school_state = _state_code)
    AND (_only_verified IS FALSE OR EXISTS(
      SELECT 1 FROM public.external_identities ei
      WHERE ei.user_id = p.id
        AND ei.verified = true
    ))
    AND (
      _search_name IS NULL
      OR p.full_name ILIKE '%' || _search_name || '%'
      OR p.username ILIKE '%' || _search_name || '%'
    )
    AND (
      _event_code IS NULL
      OR EXISTS (
        SELECT 1 FROM public.results r
        WHERE r.athlete_id = p.id
          AND r.event = _event_code
          AND r.status IN ('verified', 'approved')
      )
    )
  ORDER BY
    COALESCE(p.star_rating, 0) DESC,
    EXISTS(
      SELECT 1 FROM public.external_identities ei
      WHERE ei.user_id = p.id
        AND ei.verified = true
    ) DESC,
    (
      SELECT MAX(meet_date)
      FROM public.results r
      WHERE r.athlete_id = p.id
        AND r.status IN ('verified', 'approved')
    ) DESC NULLS LAST,
    p.full_name ASC
  LIMIT _limit OFFSET _offset;
$$;

COMMENT ON FUNCTION rpc_list_interested_athletes IS 'Returns athletes who expressed interest in a program, ranked by star rating and verification';


-- Helper: Get athlete detail for coaches
CREATE OR REPLACE FUNCTION rpc_get_athlete_detail_for_coach(
  _athlete_id uuid,
  _program_id uuid
) RETURNS TABLE (
  athlete_id uuid,
  profile_id text,
  full_name text,
  username text,
  class_year int,
  school_name text,
  school_state text,
  star_rating int,
  profile_verified boolean,
  profile_pic_url text,
  bio text,
  intent text,
  share_contact boolean,
  share_email boolean,
  share_phone boolean,
  interest_note text
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    p.id,
    p.profile_id,
    p.full_name,
    p.username,
    p.class_year,
    p.school_name,
    p.school_state,
    p.star_rating,
    EXISTS(
      SELECT 1 FROM public.external_identities ei
      WHERE ei.user_id = p.id
        AND ei.verified = true
    ) as profile_verified,
    p.profile_pic_url,
    p.bio,
    aci.intent,
    aci.share_contact,
    aci.share_email,
    aci.share_phone,
    aci.note
  FROM public.profiles p
  JOIN public.athlete_college_interests aci ON aci.athlete_id = p.id
  WHERE p.id = _athlete_id
    AND aci.program_id = _program_id
    AND aci.intent IN ('interested', 'commit')
    -- Verify caller has access to this program
    AND EXISTS (
      SELECT 1 FROM public.program_memberships pm
      WHERE pm.program_id = _program_id
        AND pm.user_id = auth.uid()
    )
  LIMIT 1;
$$;


-- Helper: Get athlete's top results
CREATE OR REPLACE FUNCTION rpc_get_athlete_results_for_coach(
  _athlete_id uuid,
  _program_id uuid
) RETURNS TABLE (
  event text,
  mark text,
  meet_name text,
  meet_date date,
  season text,
  wind numeric,
  timing text,
  proof_url text,
  status text,
  grade int
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    r.event,
    r.mark,
    r.meet_name,
    r.meet_date,
    r.season,
    r.wind,
    r.timing,
    r.proof_url,
    r.status,
    r.grade
  FROM public.results r
  WHERE r.athlete_id = _athlete_id
    AND r.status IN ('verified', 'approved')
    -- Verify caller has access to this program and athlete expressed interest
    AND EXISTS (
      SELECT 1 FROM public.athlete_college_interests aci
      JOIN public.program_memberships pm ON pm.program_id = aci.program_id
      WHERE aci.athlete_id = _athlete_id
        AND aci.program_id = _program_id
        AND pm.user_id = auth.uid()
    )
  ORDER BY r.mark_seconds_adj ASC NULLS LAST, r.meet_date DESC;
$$;


-- ============================================
-- SEED DATA (minimal for testing)
-- ============================================

-- Seed 5 programs
INSERT INTO public.programs (name, short_name, division, domain) VALUES
  ('Stanford Track & Field', 'Stanford', 'NCAA D1', 'stanford.edu'),
  ('UCLA Track & Field', 'UCLA', 'NCAA D1', 'ucla.edu'),
  ('Oregon Track & Field', 'Oregon', 'NCAA D1', 'uoregon.edu'),
  ('BYU Track & Field', 'BYU', 'NCAA D1', 'byu.edu'),
  ('Cal Poly Track & Field', 'Cal Poly', 'NCAA D1', 'calpoly.edu')
ON CONFLICT (name) DO NOTHING;

-- Example: Link 10 existing athletes to Stanford program (if they exist)
-- This will silently fail if no athletes match the criteria, which is fine for testing
INSERT INTO public.athlete_college_interests (athlete_id, program_id, college_name, intent, share_contact)
SELECT
  p.id,
  prog.id,
  prog.short_name,
  'interested',
  true
FROM public.profiles p
CROSS JOIN (SELECT id, short_name FROM public.programs WHERE name = 'Stanford Track & Field') prog
WHERE p.class_year >= 2026  -- Only recent classes
  AND p.star_rating >= 3     -- Only rated athletes
LIMIT 10
ON CONFLICT DO NOTHING;
