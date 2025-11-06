-- Phase 3: Terms of Service Acceptance Tracking
-- Track when users accept ToS for different actions

-- Add ToS acceptance columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS tos_version text;

COMMENT ON COLUMN public.profiles.tos_accepted_at IS
  'Timestamp when user accepted the Terms of Service';
COMMENT ON COLUMN public.profiles.tos_version IS
  'Version of ToS accepted (e.g., "1.0", "2024-11-05")';

-- Create table for tracking specific ToS acceptances per action type
CREATE TABLE IF NOT EXISTS public.tos_acceptances (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('submit_result', 'link_account', 'general')),
  tos_version text NOT NULL,
  ip_address inet,
  user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, action_type, tos_version)
);

CREATE INDEX IF NOT EXISTS tos_acceptances_user_idx ON public.tos_acceptances(user_id);
CREATE INDEX IF NOT EXISTS tos_acceptances_action_idx ON public.tos_acceptances(action_type);
CREATE INDEX IF NOT EXISTS tos_acceptances_accepted_at_idx ON public.tos_acceptances(accepted_at DESC);

COMMENT ON TABLE public.tos_acceptances IS
  'Track ToS acceptances per user per action type for compliance';

-- Enable RLS on tos_acceptances
ALTER TABLE public.tos_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptances
DROP POLICY IF EXISTS "Users can view own ToS acceptances" ON public.tos_acceptances;
CREATE POLICY "Users can view own ToS acceptances"
  ON public.tos_acceptances
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own acceptances
DROP POLICY IF EXISTS "Users can record own ToS acceptances" ON public.tos_acceptances;
CREATE POLICY "Users can record own ToS acceptances"
  ON public.tos_acceptances
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can view all acceptances
DROP POLICY IF EXISTS "Admins can view all ToS acceptances" ON public.tos_acceptances;
CREATE POLICY "Admins can view all ToS acceptances"
  ON public.tos_acceptances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- Helper function to check if user has accepted ToS for an action
CREATE OR REPLACE FUNCTION public.has_accepted_tos(
  p_user_id uuid,
  p_action_type text,
  p_min_version text DEFAULT '1.0'
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tos_acceptances
    WHERE user_id = p_user_id
      AND action_type = p_action_type
      AND tos_version >= p_min_version
  );
$$;

COMMENT ON FUNCTION public.has_accepted_tos IS
  'Check if user has accepted ToS for a specific action type';
