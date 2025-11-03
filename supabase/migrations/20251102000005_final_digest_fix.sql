-- Final comprehensive fix for digest constraint errors
-- This migration ensures NO digest function calls remain on the results table

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop ALL indexes on results table (we'll recreate the ones we need)
    FOR r IN
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'results'
        AND schemaname = 'public'
        AND indexname != 'results_pkey'  -- Keep primary key
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS public.' || quote_ident(r.indexname) || ' CASCADE';
    END LOOP;

    -- Drop ALL constraints on results table except primary key and foreign keys
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.results'::regclass
        AND contype NOT IN ('p', 'f')  -- Keep primary key and foreign keys
    LOOP
        EXECUTE 'ALTER TABLE public.results DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE';
    END LOOP;
END$$;

-- Recreate simple unique constraint on athlete_id + proof_url
CREATE UNIQUE INDEX IF NOT EXISTS ux_results_athlete_url
  ON public.results (athlete_id, proof_url);

-- Add any other useful indexes that don't use digest
CREATE INDEX IF NOT EXISTS results_athlete_idx ON public.results (athlete_id);
CREATE INDEX IF NOT EXISTS results_status_idx ON public.results (status);
