-- ============================================
-- FIX EXISTING COACH ACCOUNTS
-- Sets user_type to 'ncaa_coach' for users who have program memberships
-- but don't have user_type set (went through onboarding before the fix)
-- ============================================

UPDATE public.profiles
SET user_type = 'ncaa_coach'
WHERE id IN (
  SELECT DISTINCT user_id
  FROM public.program_memberships
  WHERE role = 'coach'
)
AND (user_type IS NULL OR user_type != 'ncaa_coach');

COMMENT ON TABLE public.profiles IS 'Updated to set user_type for existing coaches';
