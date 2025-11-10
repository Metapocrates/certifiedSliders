-- ============================================
-- COACH PORTAL: RATE LIMITING
-- Implement hourly rate limits for CSV exports
-- ============================================

-- 1. Rate limits tracking table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id uuid NOT NULL,
  action text NOT NULL,              -- 'csv_export', 'api_search', etc.
  window_start timestamptz NOT NULL, -- Hour bucket start
  count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, action, window_start)
);

CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action);
CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);

COMMENT ON TABLE public.rate_limits IS 'Tracks action counts per user per hour for rate limiting';
COMMENT ON COLUMN public.rate_limits.window_start IS 'Start of the hourly bucket (truncated to hour)';


-- 2. Helper function: Get bucket start time (truncate to hour)
CREATE OR REPLACE FUNCTION bucket_start(_ts timestamptz)
RETURNS timestamptz LANGUAGE sql IMMUTABLE AS $$
  SELECT date_trunc('hour', _ts);
$$;

COMMENT ON FUNCTION bucket_start IS 'Returns the start of the hourly bucket for rate limiting';


-- 3. RPC: Check and increment rate limit for CSV export
CREATE OR REPLACE FUNCTION rpc_can_export_csv()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user uuid := auth.uid();
  v_bucket timestamptz := bucket_start(now());
  v_limit int := 10; -- 10 exports per hour
  v_count int;
BEGIN
  -- Must be authenticated
  IF v_user IS NULL THEN
    RETURN false;
  END IF;

  -- Insert bucket if not exists (with count=0)
  INSERT INTO public.rate_limits(user_id, action, window_start, count)
  VALUES (v_user, 'csv_export', v_bucket, 0)
  ON CONFLICT (user_id, action, window_start) DO NOTHING;

  -- Increment counter and get new count
  UPDATE public.rate_limits
     SET count = count + 1,
         updated_at = now()
   WHERE user_id = v_user
     AND action = 'csv_export'
     AND window_start = v_bucket
   RETURNING count INTO v_count;

  -- Allow if within limit
  RETURN v_count <= v_limit;
END $$;

COMMENT ON FUNCTION rpc_can_export_csv IS 'Check if user can export CSV (increments counter). Returns true if within limit (10/hour).';


-- 4. RPC: Get remaining exports for current hour
CREATE OR REPLACE FUNCTION rpc_get_export_limit_status()
RETURNS TABLE (
  remaining int,
  limit_total int,
  window_start timestamptz,
  window_end timestamptz
) LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_user uuid := auth.uid();
  v_bucket timestamptz := bucket_start(now());
  v_limit int := 10;
  v_count int;
BEGIN
  IF v_user IS NULL THEN
    RETURN QUERY SELECT 0, v_limit, v_bucket, v_bucket + interval '1 hour';
    RETURN;
  END IF;

  -- Get current count for this hour
  SELECT COALESCE(rl.count, 0)
    INTO v_count
  FROM public.rate_limits rl
  WHERE rl.user_id = v_user
    AND rl.action = 'csv_export'
    AND rl.window_start = v_bucket;

  -- Return remaining count
  RETURN QUERY SELECT
    GREATEST(0, v_limit - COALESCE(v_count, 0)) as remaining,
    v_limit as limit_total,
    v_bucket as window_start,
    v_bucket + interval '1 hour' as window_end;
END $$;

COMMENT ON FUNCTION rpc_get_export_limit_status IS 'Returns remaining CSV exports for current hour';


-- 5. RLS for rate_limits (users can see their own)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_limits_read_self ON public.rate_limits
  FOR SELECT
  USING (user_id = auth.uid());

-- No insert/update policies - only via RPC functions

-- Admins can see all
CREATE POLICY rate_limits_read_admin ON public.rate_limits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );


-- 6. Cleanup: Delete old rate limit records (older than 7 days)
-- Run this periodically via a cron job or edge function

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '7 days';
$$;

COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Cleanup old rate limit records (run daily via cron)';
