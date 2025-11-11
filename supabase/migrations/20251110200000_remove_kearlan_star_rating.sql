-- Remove legacy profile @kearlan (profile CS-KR638)
-- This profile should not be in the database at all

-- Delete the profile (cascade will handle related records)
DELETE FROM profiles
WHERE profile_id = 'CS-KR638' OR username = 'kearlan';
