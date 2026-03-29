-- ============================================================
-- athlete_seeds — Discovered athletes from third-party sources
--
-- These are NOT full profiles (profiles.id requires auth.users.id).
-- Seeds live here until an athlete signs up and claims their record,
-- at which point data merges into their real profile.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.athlete_seeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  grad_class int,
  school_name text,
  school_state text,
  event text,

  -- Source attribution (COMPLIANCE: always present)
  source_name text NOT NULL,
  source_url text NOT NULL,
  source_rank int,           -- their rank in the source (reference only)
  source_fetched_at timestamptz NOT NULL,

  -- Claim tracking
  claimed_by uuid REFERENCES auth.users(id),  -- null until athlete claims
  claimed_at timestamptz,

  -- Lifecycle
  staging_id uuid REFERENCES public.ingestion_staging(id),  -- link back to staging
  approved_by uuid NOT NULL,  -- admin who approved
  approved_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'archived')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seeds_name_school ON public.athlete_seeds(full_name, school_name, grad_class);
CREATE INDEX IF NOT EXISTS idx_seeds_status ON public.athlete_seeds(status);
CREATE INDEX IF NOT EXISTS idx_seeds_claimed ON public.athlete_seeds(claimed_by) WHERE claimed_by IS NOT NULL;

-- RLS
ALTER TABLE public.athlete_seeds ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage athlete seeds"
  ON public.athlete_seeds FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- Anyone can read active seeds (for athlete discovery/search)
CREATE POLICY "Public can read active seeds"
  ON public.athlete_seeds FOR SELECT
  USING (status = 'active');

-- Updated_at trigger
CREATE TRIGGER trg_athlete_seeds_updated
  BEFORE UPDATE ON public.athlete_seeds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
