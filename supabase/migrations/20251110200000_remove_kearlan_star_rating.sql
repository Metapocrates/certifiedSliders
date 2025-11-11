-- Remove legacy star rating for @kearlan (profile CS-KR638)
-- Must temporarily disable the admin-only trigger to run this migration

DO $$
BEGIN
  -- Disable the trigger if it exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'enforce_star_rating_admin_trigger'
    AND tgrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles DISABLE TRIGGER enforce_star_rating_admin_trigger;
  END IF;

  -- Clear the star rating
  UPDATE profiles
  SET star_rating = NULL
  WHERE profile_id = 'CS-KR638' OR username = 'kearlan';

  -- Re-enable the trigger if it exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'enforce_star_rating_admin_trigger'
    AND tgrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ENABLE TRIGGER enforce_star_rating_admin_trigger;
  END IF;
END $$;
