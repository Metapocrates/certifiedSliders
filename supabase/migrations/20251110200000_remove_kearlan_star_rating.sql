-- Remove athlete data from @kearlan profile (CS-KR638)
-- Profile is now admin/parent but has straggler athlete data from conversion
-- Must disable user triggers (not system triggers) to allow this one-time cleanup

DO $$
DECLARE
  has_star_rating boolean;
  has_class_year boolean;
  has_gender boolean;
  has_school_name boolean;
  has_school_state boolean;
  update_sql text;
BEGIN
  -- Check which columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'star_rating'
  ) INTO has_star_rating;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'class_year'
  ) INTO has_class_year;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'gender'
  ) INTO has_gender;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'school_name'
  ) INTO has_school_name;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'school_state'
  ) INTO has_school_state;

  -- Only update if any columns exist and username 'kearlan' exists
  IF has_star_rating OR has_class_year OR has_gender OR has_school_name OR has_school_state THEN
    -- Disable user-defined triggers (not system/constraint triggers)
    ALTER TABLE profiles DISABLE TRIGGER USER;

    -- Build dynamic UPDATE statement
    update_sql := 'UPDATE profiles SET ';

    IF has_star_rating THEN
      update_sql := update_sql || 'star_rating = NULL, ';
    END IF;
    IF has_class_year THEN
      update_sql := update_sql || 'class_year = NULL, ';
    END IF;
    IF has_gender THEN
      update_sql := update_sql || 'gender = NULL, ';
    END IF;
    IF has_school_name THEN
      update_sql := update_sql || 'school_name = NULL, ';
    END IF;
    IF has_school_state THEN
      update_sql := update_sql || 'school_state = NULL, ';
    END IF;

    -- Remove trailing comma and add WHERE clause
    update_sql := rtrim(update_sql, ', ') || ' WHERE username = ''kearlan''';

    -- Execute the dynamic UPDATE only if at least one column was found
    IF update_sql != 'UPDATE profiles SET  WHERE username = ''kearlan''' THEN
      EXECUTE update_sql;
    END IF;

    -- Re-enable user triggers
    ALTER TABLE profiles ENABLE TRIGGER USER;
  END IF;
END $$;
