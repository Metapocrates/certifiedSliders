-- Remove athlete data from @kearlan profile (CS-KR638)
-- Profile is now admin/parent but has straggler athlete data from conversion
-- Must disable user triggers (not system triggers) to allow this one-time cleanup

DO $$
BEGIN
  -- Disable user-defined triggers (not system/constraint triggers)
  ALTER TABLE profiles DISABLE TRIGGER USER;

  -- Clear all athlete-specific fields
  -- Use only username since profile_id column may not exist yet
  UPDATE profiles
  SET
    star_rating = NULL,
    class_year = NULL,
    gender = NULL,
    school_name = NULL,
    school_state = NULL
  WHERE username = 'kearlan';

  -- Re-enable user triggers
  ALTER TABLE profiles ENABLE TRIGGER USER;
END $$;
