-- Quick fix for phase 2 enhancements
-- Skips the problematic initial PR computation

-- Add columns if they don't exist
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS is_pr boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_payload jsonb,
  ADD COLUMN IF NOT EXISTS source_hash text,
  ADD COLUMN IF NOT EXISTS is_wind_legal boolean;

-- Add indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'results_history_idx') THEN
    CREATE INDEX results_history_idx ON public.results(athlete_id, event, meet_date DESC NULLS LAST);
  END IF;
END $$;

-- Ensure the recompute function exists without recursion issues
CREATE OR REPLACE FUNCTION public.recompute_prs_for_event(
  p_athlete_id uuid,
  p_event text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  best_result_id bigint;
BEGIN
  -- First, mark all as not PR (avoid trigger issues)
  UPDATE public.results SET is_pr = false
  WHERE athlete_id = p_athlete_id AND event = p_event
    AND status IN ('verified', 'approved')
    AND is_pr = true; -- Only update if currently true

  -- Then find and mark the best one
  SELECT id INTO best_result_id
  FROM public.results
  WHERE athlete_id = p_athlete_id AND event = p_event
    AND status IN ('verified', 'approved')
    AND (is_wind_legal = true OR is_wind_legal IS NULL)
  ORDER BY mark_seconds ASC NULLS LAST, meet_date DESC NULLS LAST
  LIMIT 1;

  IF best_result_id IS NOT NULL THEN
    UPDATE public.results SET is_pr = true
    WHERE id = best_result_id
      AND is_pr = false; -- Only update if not already true
  END IF;
END;
$$;

COMMENT ON FUNCTION public.recompute_prs_for_event IS 'Recomputes is_pr flags for a specific athlete+event combination. Safe from recursion.';
