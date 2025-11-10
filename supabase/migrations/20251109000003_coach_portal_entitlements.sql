-- ============================================
-- COACH PORTAL: ENTITLEMENTS & FEATURE FLAGS
-- Implement tiered subscriptions and feature limits
-- ============================================

-- 1. Program entitlements table
CREATE TABLE IF NOT EXISTS public.program_entitlements (
  program_id uuid PRIMARY KEY REFERENCES public.programs(id) ON DELETE CASCADE,
  tier int NOT NULL DEFAULT 0,  -- 0=free, 1=premium, 2=enterprise
  features jsonb NOT NULL DEFAULT jsonb_build_object(
    'csv_export_limit', 10,
    'analytics_enabled', false,
    'see_all_athletes', false,
    'priority_support', false
  ),
  expires_at timestamptz,
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_program_entitlements_tier ON public.program_entitlements(tier);
CREATE INDEX idx_program_entitlements_expires ON public.program_entitlements(expires_at);

COMMENT ON TABLE public.program_entitlements IS 'Subscription tiers and feature flags for programs';
COMMENT ON COLUMN public.program_entitlements.tier IS '0=free, 1=premium ($49/mo), 2=enterprise (custom)';
COMMENT ON COLUMN public.program_entitlements.features IS 'JSON feature flags: csv_export_limit, analytics_enabled, etc.';


-- 2. RLS for entitlements
ALTER TABLE public.program_entitlements ENABLE ROW LEVEL SECURITY;

-- Coaches can see entitlements for their programs
CREATE POLICY entitlements_read_coaches ON public.program_entitlements
  FOR SELECT
  USING (
    program_id IN (
      SELECT program_id FROM public.program_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Admins can see all
CREATE POLICY entitlements_read_admin ON public.program_entitlements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );

-- Only admins can modify
CREATE POLICY entitlements_admin_write ON public.program_entitlements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );


-- 3. RPC: Check if feature is enabled for a program
CREATE OR REPLACE FUNCTION is_feature_enabled(_program_id uuid, _feature_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (features->>_feature_key)::boolean,
    tier > 0
  )
  FROM public.program_entitlements
  WHERE program_id = _program_id;
$$;

COMMENT ON FUNCTION is_feature_enabled IS 'Check if a feature is enabled for a program. Returns null if program has no entitlements.';


-- 4. RPC: Get feature value (for numeric limits like csv_export_limit)
CREATE OR REPLACE FUNCTION get_feature_value(_program_id uuid, _feature_key text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT features->>_feature_key
  FROM public.program_entitlements
  WHERE program_id = _program_id;
$$;

COMMENT ON FUNCTION get_feature_value IS 'Get the value of a feature flag (as text). Returns null if not set.';


-- 5. RPC: Get CSV export limit for a program
CREATE OR REPLACE FUNCTION get_csv_export_limit(_program_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (features->>'csv_export_limit')::int,
    10  -- Default to 10 for free tier
  )
  FROM public.program_entitlements
  WHERE program_id = _program_id;
$$;

COMMENT ON FUNCTION get_csv_export_limit IS 'Get CSV export row limit for a program. Defaults to 10 if not set.';


-- 6. Seed free tier for all existing programs
INSERT INTO public.program_entitlements (program_id, tier, features)
SELECT
  p.id,
  0,  -- Free tier
  jsonb_build_object(
    'csv_export_limit', 10,
    'analytics_enabled', false,
    'see_all_athletes', false,
    'priority_support', false
  )
FROM public.programs p
LEFT JOIN public.program_entitlements e ON e.program_id = p.id
WHERE e.program_id IS NULL;


-- 7. Example premium tier features (for reference)
-- UPDATE public.program_entitlements
-- SET
--   tier = 1,
--   features = jsonb_build_object(
--     'csv_export_limit', 999999,  -- Unlimited
--     'analytics_enabled', true,
--     'see_all_athletes', true,
--     'priority_support', true
--   )
-- WHERE program_id = 'some-program-uuid';
