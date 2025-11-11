-- Remove legacy star rating for @kearlan (profile CS-KR638)
UPDATE profiles
SET star_rating = NULL
WHERE profile_id = 'CS-KR638' OR username = 'kearlan';
