-- Remove athlete data from @kearlan profile (CS-KR638)
-- Profile is now a parent, but has straggler athlete data
-- Ratings queries filter by class_year, so clearing that removes it from dropdown

UPDATE profiles
SET
  class_year = NULL,
  gender = NULL,
  school_name = NULL,
  school_state = NULL
WHERE profile_id = 'CS-KR638' OR username = 'kearlan';
