-- Remove legacy star rating for @kearlan
UPDATE profiles
SET star_rating = NULL
WHERE username = 'kearlan';
