-- Add featured column to profiles table
-- This allows admins to manually mark profiles as "featured" for the homepage carousel

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;

-- Create index for efficient featured profile queries
CREATE INDEX IF NOT EXISTS profiles_featured_idx
ON public.profiles(featured, star_rating DESC)
WHERE featured = true;

-- Add comment
COMMENT ON COLUMN public.profiles.featured IS
'Admin-controlled flag to mark profiles as featured on homepage. Only 3-5 star athletes can be featured (enforced in application layer).';
