-- ============================================
-- ADD TEST PROGRAM FLAGS
-- ============================================
-- Adds flags to programs and program_memberships tables
-- to support Certified Sliders Test University flow

-- Add test flags to programs table
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS is_test_program boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_test_email_domains text[] DEFAULT '{}';

-- Add test flag to program_memberships (to track test coaches)
ALTER TABLE public.program_memberships
  ADD COLUMN IF NOT EXISTS is_test_coach boolean NOT NULL DEFAULT false;

-- Create index for filtering test programs
CREATE INDEX IF NOT EXISTS idx_programs_is_test ON public.programs(is_test_program);

-- Create index for filtering test coaches
CREATE INDEX IF NOT EXISTS idx_program_memberships_is_test ON public.program_memberships(is_test_coach);

-- Update the existing Test University program
UPDATE public.programs
SET
  is_test_program = true,
  allowed_test_email_domains = ARRAY['gmail.com', 'icloud.com', 'outlook.com', 'yahoo.com', 'hotmail.com'],
  name = 'Certified Sliders Test University Track & Field',
  short_name = 'CS Test U',
  division = 'TEST',
  domain = 'certifiedsliders-test.edu'  -- Fake domain for testing
WHERE name = 'Test University Track & Field'
   OR short_name = 'TEST';

-- If no test school exists, insert it
INSERT INTO public.programs (
  name,
  short_name,
  division,
  sport,
  domain,
  location_city,
  location_state,
  is_active,
  is_test_program,
  allowed_test_email_domains
)
VALUES (
  'Certified Sliders Test University Track & Field',
  'CS Test U',
  'TEST',
  'Track & Field',
  'certifiedsliders-test.edu',
  'Test City',
  'CA',
  true,
  true,
  ARRAY['gmail.com', 'icloud.com', 'outlook.com', 'yahoo.com', 'hotmail.com']
)
ON CONFLICT (name) DO UPDATE
SET
  is_test_program = EXCLUDED.is_test_program,
  allowed_test_email_domains = EXCLUDED.allowed_test_email_domains,
  domain = EXCLUDED.domain,
  short_name = EXCLUDED.short_name,
  division = EXCLUDED.division;

-- Add comment explaining the test program
COMMENT ON COLUMN public.programs.is_test_program IS 'Marks programs used for internal testing. Test programs allow non-.edu email registration.';
COMMENT ON COLUMN public.programs.allowed_test_email_domains IS 'Array of email domains (e.g., gmail.com) that can register for this test program.';
COMMENT ON COLUMN public.program_memberships.is_test_coach IS 'Marks coaches registered to test programs for easy cleanup.';
