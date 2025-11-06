-- Add unique profile IDs visible to admins and profile owners
-- Format: CS-XXXXX (5 alphanumeric characters, uppercase)

-- Add profile_id column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_id text UNIQUE;

-- Function to generate unique profile ID
CREATE OR REPLACE FUNCTION public.generate_profile_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude ambiguous: 0O1I
  result text;
  attempts int := 0;
  max_attempts int := 100;
BEGIN
  LOOP
    -- Generate random 5-character code
    result := 'CS-' ||
      substr(chars, floor(random() * length(chars) + 1)::int, 1) ||
      substr(chars, floor(random() * length(chars) + 1)::int, 1) ||
      substr(chars, floor(random() * length(chars) + 1)::int, 1) ||
      substr(chars, floor(random() * length(chars) + 1)::int, 1) ||
      substr(chars, floor(random() * length(chars) + 1)::int, 1);

    -- Check if it's unique
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profile_id = result) THEN
      RETURN result;
    END IF;

    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique profile_id after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Trigger to auto-generate profile_id for new profiles
CREATE OR REPLACE FUNCTION public.ensure_profile_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_id IS NULL THEN
    NEW.profile_id := public.generate_profile_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_profile_id_trigger ON public.profiles;
CREATE TRIGGER ensure_profile_id_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_profile_id();

-- Backfill existing profiles with IDs
UPDATE public.profiles
SET profile_id = public.generate_profile_id()
WHERE profile_id IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_profile_id_idx ON public.profiles(profile_id);

-- Add helpful comment
COMMENT ON COLUMN public.profiles.profile_id IS 'Unique identifier in format CS-XXXXX, visible to admins and profile owners for support/moderation';
