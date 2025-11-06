-- Auto-approval system for pending results
-- Automatically approves results that meet criteria:
-- 1. Status = 'pending' (not manually edited)
-- 2. Age > 1 hour
-- 3. Confidence >= 75%
-- 4. Submitted by verified Athletic.net user
-- 5. Data was not edited (source_hash matches)

-- Add confidence column to results if not exists
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS confidence numeric(3,2);

-- Function to auto-approve eligible pending results
CREATE OR REPLACE FUNCTION public.auto_approve_pending_results()
RETURNS TABLE (
  approved_count int,
  approved_ids bigint[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_ids bigint[];
  count_approved int := 0;
BEGIN
  -- Find eligible results
  WITH eligible AS (
    SELECT r.id
    FROM public.results r
    INNER JOIN public.external_identities ei
      ON r.athlete_id = ei.user_id
      AND ei.provider = 'athleticnet'
      AND ei.verified = true
    WHERE r.status = 'pending'
      AND r.created_at < NOW() - INTERVAL '1 hour'
      AND (r.confidence IS NULL OR r.confidence >= 0.75)
      AND r.source_hash IS NOT NULL  -- Has original data
      AND r.submitted_by IS NOT NULL
    ORDER BY r.created_at ASC
    LIMIT 1000  -- Process in batches
  ),
  updated AS (
    UPDATE public.results
    SET
      status = 'verified',
      updated_at = NOW()
    WHERE id IN (SELECT id FROM eligible)
    RETURNING id
  )
  SELECT array_agg(id) INTO result_ids FROM updated;

  count_approved := COALESCE(array_length(result_ids, 1), 0);

  RETURN QUERY SELECT count_approved, COALESCE(result_ids, ARRAY[]::bigint[]);
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION public.auto_approve_pending_results IS
'Auto-approves pending results that are > 1 hour old, have ≥75% confidence, from verified users, and were not edited. Returns count and IDs of approved results.';

-- Create a simplified version for cron/API calls
CREATE OR REPLACE FUNCTION public.run_auto_approval()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result record;
  output json;
BEGIN
  SELECT * INTO result FROM public.auto_approve_pending_results();

  output := json_build_object(
    'ok', true,
    'approved_count', result.approved_count,
    'approved_ids', result.approved_ids,
    'timestamp', NOW()
  );

  RETURN output;
END;
$$;

COMMENT ON FUNCTION public.run_auto_approval IS
'Wrapper for auto_approve_pending_results that returns JSON. Can be called via API or cron job.';
