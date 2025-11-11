-- Remove legacy star rating for @kearlan (profile CS-KR638)
-- Must temporarily disable the admin-only trigger to run this migration

-- Disable the trigger
ALTER TABLE profiles DISABLE TRIGGER IF EXISTS enforce_star_rating_admin_trigger;

-- Clear the star rating
UPDATE profiles
SET star_rating = NULL
WHERE profile_id = 'CS-KR638' OR username = 'kearlan';

-- Re-enable the trigger
ALTER TABLE profiles ENABLE TRIGGER IF EXISTS enforce_star_rating_admin_trigger;
