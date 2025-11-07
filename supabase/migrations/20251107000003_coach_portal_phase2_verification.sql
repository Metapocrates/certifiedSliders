-- ============================================
-- COACH PORTAL PHASE 2: VERIFICATION SYSTEM
-- Implements tiered verification for coaches
-- ============================================

-- 1. Program Domains (for email/domain verification)
CREATE TABLE IF NOT EXISTS public.program_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_primary boolean DEFAULT false,
  verified_at timestamptz,
  verification_method text,  -- 'sso', 'dns', 'http', 'admin'
  added_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(program_id, domain)
);

CREATE INDEX idx_program_domains_program ON public.program_domains(program_id);
CREATE INDEX idx_program_domains_domain ON public.program_domains(domain);

COMMENT ON TABLE public.program_domains IS 'Verified domains for each program (e.g., stanford.edu)';


-- 2. Coach Verification Scores
CREATE TABLE IF NOT EXISTS public.coach_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0,
  tier int NOT NULL DEFAULT 0,  -- 0=limited, 1=verified, 2=coordinator
  signals jsonb DEFAULT '{}'::jsonb,  -- Stores verification signals
  last_computed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, program_id)
);

CREATE INDEX idx_cv_user ON public.coach_verification(user_id);
CREATE INDEX idx_cv_program ON public.coach_verification(program_id);
CREATE INDEX idx_cv_tier ON public.coach_verification(tier);

COMMENT ON TABLE public.coach_verification IS 'Verification scores and tiers for coaches';
COMMENT ON COLUMN public.coach_verification.signals IS 'JSON object tracking verification signals (sso, dns, http, admin, etc.)';


-- 3. Domain Challenges (DNS/HTTP proof)
CREATE TABLE IF NOT EXISTS public.coach_domain_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain text NOT NULL,
  method text CHECK (method IN ('dns','http')) NOT NULL,
  nonce text NOT NULL,  -- Random token to prove ownership
  status text CHECK (status IN ('pending','verified','expired','failed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  error_message text
);

CREATE INDEX idx_cdc_program ON public.coach_domain_challenges(program_id);
CREATE INDEX idx_cdc_user ON public.coach_domain_challenges(user_id);
CREATE INDEX idx_cdc_status ON public.coach_domain_challenges(status);
CREATE INDEX idx_cdc_nonce ON public.coach_domain_challenges(nonce);

COMMENT ON TABLE public.coach_domain_challenges IS 'DNS/HTTP domain ownership challenges for verification';


-- ============================================
-- RLS POLICIES
-- ============================================

-- Program Domains: read by authenticated, write by admins
ALTER TABLE public.program_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY program_domains_read_all ON public.program_domains
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY program_domains_admin_write ON public.program_domains
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );


-- Coach Verification: users see their own, admins see all
ALTER TABLE public.coach_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY cv_read_self ON public.coach_verification
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY cv_read_admin ON public.coach_verification
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );

-- Only system/admin can write (through RPC functions)
CREATE POLICY cv_admin_write ON public.coach_verification
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );


-- Domain Challenges: users see their own, admins see all
ALTER TABLE public.coach_domain_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY cdc_read_self ON public.coach_domain_challenges
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY cdc_insert_self ON public.coach_domain_challenges
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY cdc_update_self ON public.coach_domain_challenges
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY cdc_read_admin ON public.coach_domain_challenges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );


-- ============================================
-- RPC FUNCTIONS - SCORING ENGINE
-- ============================================

-- Compute verification score for a coach
CREATE OR REPLACE FUNCTION rpc_compute_coach_verification_score(
  _user_id uuid,
  _program_id uuid
) RETURNS TABLE (
  score int,
  tier int,
  signals jsonb
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _score int := 0;
  _tier int := 0;
  _signals jsonb := '{}'::jsonb;
  _user_email text;
  _program_domain text;
BEGIN
  -- Get user email
  SELECT email INTO _user_email
  FROM auth.users
  WHERE id = _user_id;

  -- Get program primary domain
  SELECT domain INTO _program_domain
  FROM public.programs
  WHERE id = _program_id;

  -- Signal 1: Email domain match (+30 points)
  IF _user_email IS NOT NULL AND _program_domain IS NOT NULL THEN
    IF _user_email ILIKE '%@' || _program_domain THEN
      _score := _score + 30;
      _signals := jsonb_set(_signals, '{email_domain_match}', 'true'::jsonb);
    END IF;
  END IF;

  -- Signal 2: Verified DNS challenge (+40 points)
  IF EXISTS (
    SELECT 1 FROM public.coach_domain_challenges
    WHERE user_id = _user_id
      AND program_id = _program_id
      AND method = 'dns'
      AND status = 'verified'
  ) THEN
    _score := _score + 40;
    _signals := jsonb_set(_signals, '{dns_verified}', 'true'::jsonb);
  END IF;

  -- Signal 3: Verified HTTP challenge (+40 points)
  IF EXISTS (
    SELECT 1 FROM public.coach_domain_challenges
    WHERE user_id = _user_id
      AND program_id = _program_id
      AND method = 'http'
      AND status = 'verified'
  ) THEN
    _score := _score + 40;
    _signals := jsonb_set(_signals, '{http_verified}', 'true'::jsonb);
  END IF;

  -- Signal 4: Admin invitation (check invited_by in program_memberships) (+70 points)
  IF EXISTS (
    SELECT 1 FROM public.program_memberships pm
    WHERE pm.user_id = _user_id
      AND pm.program_id = _program_id
      AND pm.invited_by IS NOT NULL
  ) THEN
    _score := _score + 70;
    _signals := jsonb_set(_signals, '{admin_invited}', 'true'::jsonb);
  END IF;

  -- Determine tier from score
  IF _score >= 70 THEN
    _tier := 2;  -- Coordinator
  ELSIF _score >= 30 THEN
    _tier := 1;  -- Verified
  ELSE
    _tier := 0;  -- Limited
  END IF;

  RETURN QUERY SELECT _score, _tier, _signals;
END;
$$;


-- Update or create coach verification record
CREATE OR REPLACE FUNCTION rpc_update_coach_verification(
  _user_id uuid,
  _program_id uuid
) RETURNS TABLE (
  score int,
  tier int,
  signals jsonb
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _result record;
BEGIN
  -- Compute score
  SELECT * INTO _result
  FROM rpc_compute_coach_verification_score(_user_id, _program_id);

  -- Upsert verification record
  INSERT INTO public.coach_verification (
    user_id,
    program_id,
    score,
    tier,
    signals,
    last_computed_at
  ) VALUES (
    _user_id,
    _program_id,
    _result.score,
    _result.tier,
    _result.signals,
    now()
  )
  ON CONFLICT (user_id, program_id)
  DO UPDATE SET
    score = EXCLUDED.score,
    tier = EXCLUDED.tier,
    signals = EXCLUDED.signals,
    last_computed_at = EXCLUDED.last_computed_at,
    updated_at = now();

  RETURN QUERY SELECT _result.score, _result.tier, _result.signals;
END;
$$;


-- Get coach verification status
CREATE OR REPLACE FUNCTION rpc_get_coach_verification_status(
  _user_id uuid,
  _program_id uuid
) RETURNS TABLE (
  score int,
  tier int,
  signals jsonb,
  last_computed_at timestamptz
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    COALESCE(cv.score, 0) as score,
    COALESCE(cv.tier, 0) as tier,
    COALESCE(cv.signals, '{}'::jsonb) as signals,
    cv.last_computed_at
  FROM public.coach_verification cv
  WHERE cv.user_id = _user_id
    AND cv.program_id = _program_id
  UNION ALL
  SELECT 0, 0, '{}'::jsonb, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM public.coach_verification
    WHERE user_id = _user_id AND program_id = _program_id
  )
  LIMIT 1;
$$;


-- ============================================
-- SEED DATA - Add domains to existing programs
-- ============================================

-- Add primary domains for seeded programs
INSERT INTO public.program_domains (program_id, domain, is_primary, verified_at, verification_method)
SELECT id, domain, true, now(), 'admin'
FROM public.programs
WHERE domain IS NOT NULL
ON CONFLICT (program_id, domain) DO NOTHING;
