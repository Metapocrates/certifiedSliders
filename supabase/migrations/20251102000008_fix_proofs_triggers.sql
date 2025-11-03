-- Fix proofs table triggers that use digest function
-- This resolves the "function digest(bytea, unknown) does not exist" error

-- Drop existing triggers
DROP TRIGGER IF EXISTS trg_proofs_hash ON public.proofs;
DROP TRIGGER IF EXISTS trg_proofs_sync_provider ON public.proofs;
DROP TRIGGER IF EXISTS trg_proofs_sync_urls ON public.proofs;

-- Drop old function definitions that might use digest
DROP FUNCTION IF EXISTS public.proofs_set_hash() CASCADE;
DROP FUNCTION IF EXISTS public.proofs_sync_provider() CASCADE;
DROP FUNCTION IF EXISTS public.proofs_sync_urls() CASCADE;

-- Recreate proofs_set_hash WITHOUT digest - use simple MD5 hash instead
CREATE OR REPLACE FUNCTION public.proofs_set_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use MD5 instead of digest - it's built-in and doesn't require pgcrypto
  IF NEW.url IS NOT NULL THEN
    NEW.url_hash := md5(NEW.url);
  ELSIF NEW.source_url IS NOT NULL THEN
    NEW.url_hash := md5(NEW.source_url);
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate proofs_sync_provider - sync provider field from source field
CREATE OR REPLACE FUNCTION public.proofs_sync_provider()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sync provider from source if provider is null
  IF NEW.provider IS NULL AND NEW.source IS NOT NULL THEN
    NEW.provider := NEW.source::text;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate proofs_sync_urls - ensure url and source_url are in sync
CREATE OR REPLACE FUNCTION public.proofs_sync_urls()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sync url to source_url if source_url is set but url isn't
  IF NEW.source_url IS NOT NULL AND NEW.url IS NULL THEN
    NEW.url := NEW.source_url;
  END IF;
  -- Sync source_url to url if url is set but source_url isn't
  IF NEW.url IS NOT NULL AND NEW.source_url IS NULL THEN
    NEW.source_url := NEW.url;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER trg_proofs_hash
  BEFORE INSERT ON public.proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.proofs_set_hash();

CREATE TRIGGER trg_proofs_sync_provider
  BEFORE INSERT OR UPDATE ON public.proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.proofs_sync_provider();

CREATE TRIGGER trg_proofs_sync_urls
  BEFORE INSERT OR UPDATE ON public.proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.proofs_sync_urls();
