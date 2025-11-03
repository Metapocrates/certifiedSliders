-- Remove any generated columns or check constraints that might use digest
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop any check constraints on results table
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.results'::regclass
        AND contype = 'c'  -- check constraints
    LOOP
        EXECUTE 'ALTER TABLE public.results DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE';
    END LOOP;

    -- Drop any columns that might be generated and use digest
    -- Common column names that might use digest: proof_hash, url_hash, etc.
    BEGIN
        ALTER TABLE public.results DROP COLUMN IF EXISTS proof_hash CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER TABLE public.results DROP COLUMN IF EXISTS url_hash CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER TABLE public.results DROP COLUMN IF EXISTS proof_url_hash CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END$$;
