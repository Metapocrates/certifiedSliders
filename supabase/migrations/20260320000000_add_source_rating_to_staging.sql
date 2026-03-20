-- Add source_rating column to ingestion_staging
-- Stores the source's star rating (e.g. SCA's 3-5 star) as a reference field.
-- This is NOT our rating — it's attributed third-party data.
ALTER TABLE IF EXISTS public.ingestion_staging
  ADD COLUMN IF NOT EXISTS source_rating int;
