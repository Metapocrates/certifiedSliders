-- ============================================
-- CREATE TEST SCHOOL FOR TESTING
-- ============================================

INSERT INTO public.programs (name, short_name, division, sport, location_state, is_active)
VALUES
  ('Test University Track & Field', 'TEST', 'Test', 'Track & Field', 'CA', true)
ON CONFLICT (name) DO UPDATE SET
  short_name = EXCLUDED.short_name,
  division = EXCLUDED.division,
  is_active = EXCLUDED.is_active;

COMMENT ON TABLE public.programs IS 'Added Test University for development/testing purposes';
