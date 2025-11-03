-- Drop and recreate trigger functions that might be using digest
-- This fixes the "function digest(bytea, unknown) does not exist" error

-- Drop existing triggers
DROP TRIGGER IF EXISTS trg_results_created_by ON public.results;
DROP TRIGGER IF EXISTS trg_results_fill_adjusted ON public.results;

-- Drop old function definitions that might use digest
DROP FUNCTION IF EXISTS public.set_created_by() CASCADE;
DROP FUNCTION IF EXISTS public.results_fill_adjusted_time() CASCADE;

-- Recreate set_created_by function (simple, no digest)
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate results_fill_adjusted_time function (simple, no digest)
-- This calls the adjust_time function if it exists
CREATE OR REPLACE FUNCTION public.results_fill_adjusted_time()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_adjusted RECORD;
BEGIN
  -- Only adjust if we have mark_seconds and timing
  IF NEW.mark_seconds IS NOT NULL AND NEW.timing IS NOT NULL THEN
    BEGIN
      -- Try to call adjust_time function
      SELECT * INTO v_adjusted
      FROM public.adjust_time(NEW.event, NEW.mark_seconds, NEW.timing);

      IF FOUND THEN
        NEW.mark_seconds_adj := (v_adjusted.seconds)::numeric;
      ELSE
        NEW.mark_seconds_adj := NEW.mark_seconds;
      END IF;
    EXCEPTION
      WHEN undefined_function THEN
        -- adjust_time doesn't exist, just copy mark_seconds
        NEW.mark_seconds_adj := NEW.mark_seconds;
      WHEN OTHERS THEN
        -- Any other error, just copy mark_seconds
        NEW.mark_seconds_adj := NEW.mark_seconds;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER trg_results_created_by
  BEFORE INSERT ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION public.set_created_by();

CREATE TRIGGER trg_results_fill_adjusted
  BEFORE INSERT OR UPDATE OF mark_seconds, timing, event ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION public.results_fill_adjusted_time();
