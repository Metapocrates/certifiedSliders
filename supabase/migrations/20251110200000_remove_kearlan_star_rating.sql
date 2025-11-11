-- Remove athlete data from @kearlan profile (CS-KR638)
-- Profile is now admin/parent but has straggler athlete data from conversion
-- Must disable multiple triggers to allow this one-time cleanup

DO $$
BEGIN
  -- Disable all triggers that would block this update
  ALTER TABLE profiles DISABLE TRIGGER ALL;

  -- Clear all athlete-specific fields
  UPDATE profiles
  SET
    star_rating = NULL,
    class_year = NULL,
    gender = NULL,
    school_name = NULL,
    school_state = NULL
  WHERE profile_id = 'CS-KR638' OR username = 'kearlan';

  -- Re-enable all triggers
  ALTER TABLE profiles ENABLE TRIGGER ALL;
END $$;
