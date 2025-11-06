-- Result reporting system for flagging suspicious results

-- Create result_reports table
CREATE TABLE IF NOT EXISTS public.result_reports (
  id bigserial PRIMARY KEY,
  result_id bigint NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS result_reports_result_id_idx ON public.result_reports(result_id);
CREATE INDEX IF NOT EXISTS result_reports_reported_by_idx ON public.result_reports(reported_by);
CREATE INDEX IF NOT EXISTS result_reports_status_idx ON public.result_reports(status, created_at DESC);

-- Enable RLS
ALTER TABLE public.result_reports ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON public.result_reports
  FOR SELECT
  USING (auth.uid() = reported_by);

-- Users can create reports (if authenticated)
CREATE POLICY "Authenticated users can create reports"
  ON public.result_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reported_by AND auth.uid() IS NOT NULL);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON public.result_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Admins can update reports
CREATE POLICY "Admins can update reports"
  ON public.result_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Add report count to results (denormalized for performance)
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS report_count int DEFAULT 0;

-- Function to update report count
CREATE OR REPLACE FUNCTION public.update_result_report_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.results
    SET report_count = report_count + 1
    WHERE id = NEW.result_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.results
    SET report_count = GREATEST(0, report_count - 1)
    WHERE id = OLD.result_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger to maintain report count
DROP TRIGGER IF EXISTS update_result_report_count_trigger ON public.result_reports;
CREATE TRIGGER update_result_report_count_trigger
  AFTER INSERT OR DELETE ON public.result_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_result_report_count();

-- Backfill report counts
UPDATE public.results r
SET report_count = (
  SELECT COUNT(*) FROM public.result_reports
  WHERE result_id = r.id
);

COMMENT ON TABLE public.result_reports IS 'User-submitted reports of suspicious or incorrect results';
COMMENT ON COLUMN public.results.report_count IS 'Denormalized count of reports for this result';
