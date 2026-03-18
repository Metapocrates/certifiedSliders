-- ============================================================
-- THIRD-PARTY RANKING INGESTION SYSTEM
-- Purpose: Athlete discovery + profile seeding from public rankings
-- Compliance: Only factual data with full provenance, no editorial content
-- ============================================================

-- ============================================================
-- 1. ingestion_sources — Source registry with kill switch
-- ============================================================
CREATE TABLE public.ingestion_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,           -- slug: 'sca_recruiting', 'prepstar', etc.
  name text NOT NULL,                 -- display name: 'SCA Recruiting'
  base_url text NOT NULL,             -- e.g. 'https://scarecruitingranking.com'
  is_enabled boolean NOT NULL DEFAULT false,  -- KILL SWITCH: false = all ingestion halted
  crawl_delay_ms int NOT NULL DEFAULT 2000,   -- minimum ms between requests
  robots_txt_checked_at timestamptz,          -- when we last verified robots.txt
  robots_txt_allows boolean,                  -- does robots.txt permit our bot?
  field_allowlist jsonb NOT NULL DEFAULT '["athlete_name","grad_class","rank","event","school","state"]'::jsonb,
  max_records_per_run int NOT NULL DEFAULT 500,  -- safety cap per ingestion run
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ingestion_sources IS 'Registry of third-party ranking sources for athlete discovery. Each source has an independent kill switch.';
COMMENT ON COLUMN public.ingestion_sources.is_enabled IS 'Kill switch: set to false to instantly disable all ingestion from this source.';
COMMENT ON COLUMN public.ingestion_sources.field_allowlist IS 'COMPLIANCE: Only these factual fields may be extracted. Editorial content is never allowed.';

-- ============================================================
-- 2. ingestion_runs — Audit trail for each ingestion execution
-- ============================================================
CREATE TABLE public.ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.ingestion_sources(id),
  source_url text NOT NULL,             -- specific page URL ingested
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'aborted')),
  records_found int NOT NULL DEFAULT 0,
  records_staged int NOT NULL DEFAULT 0,
  records_skipped int NOT NULL DEFAULT 0,   -- duplicates or filtered out
  error_message text,
  triggered_by uuid REFERENCES auth.users(id),  -- admin who triggered, or null for cron
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingestion_runs_source ON public.ingestion_runs(source_id);
CREATE INDEX idx_ingestion_runs_status ON public.ingestion_runs(status);

COMMENT ON TABLE public.ingestion_runs IS 'Audit trail for every ingestion execution. Tracks what was fetched, when, and by whom.';

-- ============================================================
-- 3. ingestion_staging — Unverified staging layer
--    COMPLIANCE: Only factual fields. No editorial content.
--    Nothing here is published until admin approval.
-- ============================================================
CREATE TABLE public.ingestion_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ingestion_runs(id),
  source_id uuid NOT NULL REFERENCES public.ingestion_sources(id),

  -- FACTUAL FIELDS ONLY (compliance: no editorial text, descriptions, or blurbs)
  athlete_name text NOT NULL,
  grad_class int,                        -- graduation year (e.g. 2026)
  raw_rank int,                          -- rank number from source (reference only, NOT our ranking)
  event text,                            -- primary event if listed
  school text,                           -- school name if listed
  state text,                            -- state code if listed

  -- PROVENANCE (compliance: every record must have full attribution)
  source_url text NOT NULL,              -- exact page URL where data was found
  source_name text NOT NULL,             -- e.g. 'SCA Recruiting'
  source_fetched_at timestamptz NOT NULL DEFAULT now(),

  -- MATCHING / DEDUP
  matched_profile_id uuid REFERENCES public.profiles(id),  -- null until matched
  match_confidence numeric(3,2) CHECK (match_confidence >= 0 AND match_confidence <= 1),
  match_method text,                     -- 'exact_name_school_class', 'fuzzy_name_school', etc.

  -- REVIEW STATUS
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'merged', 'duplicate')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,

  -- DEDUP
  record_hash text NOT NULL,             -- hash of (source_id, athlete_name, grad_class, event) for dedup
  confidence numeric(3,2) NOT NULL DEFAULT 0.50
    CHECK (confidence >= 0 AND confidence <= 1),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staging_source ON public.ingestion_staging(source_id);
CREATE INDEX idx_staging_run ON public.ingestion_staging(run_id);
CREATE INDEX idx_staging_status ON public.ingestion_staging(status);
CREATE INDEX idx_staging_hash ON public.ingestion_staging(record_hash);
CREATE INDEX idx_staging_matched ON public.ingestion_staging(matched_profile_id) WHERE matched_profile_id IS NOT NULL;
CREATE INDEX idx_staging_name_school ON public.ingestion_staging(athlete_name, school, grad_class);

COMMENT ON TABLE public.ingestion_staging IS 'Staging layer for third-party ranking data. COMPLIANCE: Only factual fields with full provenance. Admin approval required before any data reaches production.';
COMMENT ON COLUMN public.ingestion_staging.raw_rank IS 'Third-party rank number stored as reference only. This is NOT used as our ranking.';
COMMENT ON COLUMN public.ingestion_staging.record_hash IS 'Dedup hash of (source_id, athlete_name, grad_class, event) to prevent duplicate staging records.';

-- Prevent duplicate staging records from same source
CREATE UNIQUE INDEX idx_staging_dedup ON public.ingestion_staging(source_id, record_hash)
  WHERE status NOT IN ('rejected', 'duplicate');

-- ============================================================
-- 4. RLS Policies — Admin only
-- ============================================================

ALTER TABLE public.ingestion_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_staging ENABLE ROW LEVEL SECURITY;

-- ingestion_sources: admin read/write
CREATE POLICY "Admins can manage ingestion sources"
  ON public.ingestion_sources FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- ingestion_runs: admin read, service role write
CREATE POLICY "Admins can read ingestion runs"
  ON public.ingestion_runs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert ingestion runs"
  ON public.ingestion_runs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update ingestion runs"
  ON public.ingestion_runs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- ingestion_staging: admin full access
CREATE POLICY "Admins can manage staging records"
  ON public.ingestion_staging FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- ============================================================
-- 5. Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ingestion_sources_updated
  BEFORE UPDATE ON public.ingestion_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ingestion_staging_updated
  BEFORE UPDATE ON public.ingestion_staging
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 6. Compliance guard: Prevent staging records with empty provenance
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_ingestion_provenance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- COMPLIANCE: Every staged record MUST have provenance
  IF NEW.source_url IS NULL OR NEW.source_url = '' THEN
    RAISE EXCEPTION 'COMPLIANCE: source_url is required for all ingestion records';
  END IF;
  IF NEW.source_name IS NULL OR NEW.source_name = '' THEN
    RAISE EXCEPTION 'COMPLIANCE: source_name is required for all ingestion records';
  END IF;
  IF NEW.source_fetched_at IS NULL THEN
    RAISE EXCEPTION 'COMPLIANCE: source_fetched_at is required for all ingestion records';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_provenance
  BEFORE INSERT OR UPDATE ON public.ingestion_staging
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ingestion_provenance();

COMMENT ON FUNCTION public.enforce_ingestion_provenance IS 'COMPLIANCE: Database-level enforcement that all ingestion records have full provenance metadata.';
