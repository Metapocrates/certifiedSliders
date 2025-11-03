-- Aggressively remove all digest-based constraints and indexes on results table

-- Drop all potential digest-based constraints by name
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all indexes on results table that use digest
    FOR r IN
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'results'
        AND schemaname = 'public'
        AND indexdef ILIKE '%digest%'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS public.' || quote_ident(r.indexname) || ' CASCADE';
    END LOOP;

    -- Drop all constraints on results table that use digest
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.results'::regclass
        AND pg_get_constraintdef(oid) ILIKE '%digest%'
    LOOP
        EXECUTE 'ALTER TABLE public.results DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE';
    END LOOP;
END$$;

-- Recreate simple unique constraint on athlete_id + proof_url
CREATE UNIQUE INDEX IF NOT EXISTS ux_results_athlete_url
  ON public.results (athlete_id, proof_url);
