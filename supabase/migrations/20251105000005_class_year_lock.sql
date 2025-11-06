-- Phase 3: Class Year Lock System
-- Prevents athletes from changing class_year after initial set
-- Only admins can override with audit trail

-- Add class_year_locked_at to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS class_year_locked_at timestamptz;

COMMENT ON COLUMN public.profiles.class_year_locked_at IS
  'Timestamp when class_year was locked. Once set, only admins can change class_year.';

-- Create audit_logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  old_value jsonb,
  new_value jsonb,
  reason text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS
  'Audit trail for sensitive admin actions like class year overrides, bans, etc.';

-- Enable RLS on audit_logs (admins only)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
    )
  );

-- Note: is_admin(uuid) function already exists from previous migration

-- Trigger function to enforce class_year lock
CREATE OR REPLACE FUNCTION public.enforce_class_year_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if class_year is not being changed
  IF NEW.class_year IS NOT DISTINCT FROM OLD.class_year THEN
    RETURN NEW;
  END IF;

  -- Allow if not locked yet
  IF OLD.class_year_locked_at IS NULL THEN
    -- First time setting class_year - lock it
    IF NEW.class_year IS NOT NULL AND OLD.class_year IS NULL THEN
      NEW.class_year_locked_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- If locked, only allow admin changes
  IF OLD.class_year_locked_at IS NOT NULL THEN
    IF auth.uid() IS NOT NULL AND public.is_admin(auth.uid()) THEN
      -- Admin is changing it - allow and log
      -- Note: Actual audit log insert happens in the API layer
      RETURN NEW;
    ELSE
      -- Non-admin trying to change locked class_year
      RAISE EXCEPTION 'class_year is locked and cannot be changed. Contact support for assistance.'
        USING ERRCODE = '23503',
              HINT = 'Only administrators can modify class_year after it has been set.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for class_year enforcement
DROP TRIGGER IF EXISTS enforce_class_year_lock_trigger ON public.profiles;
CREATE TRIGGER enforce_class_year_lock_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_class_year_lock();

-- Backfill: Lock existing class_years
UPDATE public.profiles
SET class_year_locked_at = NOW()
WHERE class_year IS NOT NULL
  AND class_year_locked_at IS NULL;
