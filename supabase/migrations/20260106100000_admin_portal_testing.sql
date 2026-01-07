-- Migration: Admin Portal Testing Infrastructure
-- Adds tables for admin portal switching and impersonation audit logging

-- Create admin portal audit logs table
CREATE TABLE IF NOT EXISTS public.admin_portal_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- SET_PORTAL_OVERRIDE, CLEAR_PORTAL_OVERRIDE, START_IMPERSONATION, STOP_IMPERSONATION
  portal_key TEXT, -- ATHLETE, NCAA_COACH, HS_COACH, PARENT
  impersonated_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  meta JSONB DEFAULT '{}'::jsonb, -- Additional metadata (userAgent, ip, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for querying logs by admin
CREATE INDEX IF NOT EXISTS idx_admin_portal_audit_logs_admin_id
ON public.admin_portal_audit_logs(admin_id);

-- Add index for querying by action type
CREATE INDEX IF NOT EXISTS idx_admin_portal_audit_logs_action
ON public.admin_portal_audit_logs(action);

-- Add index for querying by impersonated user
CREATE INDEX IF NOT EXISTS idx_admin_portal_audit_logs_impersonated
ON public.admin_portal_audit_logs(impersonated_user_id)
WHERE impersonated_user_id IS NOT NULL;

-- RLS policies
ALTER TABLE public.admin_portal_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write audit logs
CREATE POLICY "Admins can insert audit logs" ON public.admin_portal_audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read their own audit logs" ON public.admin_portal_audit_logs
  FOR SELECT
  USING (
    admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );

-- Super admins (with specific permission) can read all audit logs
-- This uses a JSONB check on the admins table permissions field if it exists
-- For now, we'll just allow admins to see their own logs

-- Grant permissions
GRANT SELECT, INSERT ON public.admin_portal_audit_logs TO authenticated;

-- Add is_test_account column to profiles if it doesn't exist
-- This helps identify test accounts for impersonation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'is_test_account'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_test_account BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add index for querying test accounts
CREATE INDEX IF NOT EXISTS idx_profiles_is_test_account
ON public.profiles(is_test_account)
WHERE is_test_account = true;

-- Comment on table
COMMENT ON TABLE public.admin_portal_audit_logs IS 'Audit log for admin portal testing actions (preview mode, impersonation)';
COMMENT ON COLUMN public.admin_portal_audit_logs.action IS 'Type of action: SET_PORTAL_OVERRIDE, CLEAR_PORTAL_OVERRIDE, START_IMPERSONATION, STOP_IMPERSONATION';
COMMENT ON COLUMN public.admin_portal_audit_logs.portal_key IS 'Portal being previewed: ATHLETE, NCAA_COACH, HS_COACH, PARENT';
COMMENT ON COLUMN public.admin_portal_audit_logs.impersonated_user_id IS 'User being impersonated (if in impersonation mode)';
