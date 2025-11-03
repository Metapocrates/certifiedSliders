-- Fix digest function type casting error in results table constraint

-- Drop existing constraint if it exists
DROP INDEX IF EXISTS public.ux_results_athlete_url;

-- Recreate using URL directly without digest (simpler and avoids type issues)
CREATE UNIQUE INDEX IF NOT EXISTS ux_results_athlete_url
  ON public.results (athlete_id, proof_url);
