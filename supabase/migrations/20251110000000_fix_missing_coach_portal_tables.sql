-- ============================================
-- FIX: Ensure coach portal tables exist
-- This is a safety migration to create tables if they're missing
-- ============================================

-- 1. Programs table
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  short_name text,
  division text,
  sport text NOT NULL DEFAULT 'Track & Field',
  domain text,
  logo_url text,
  location_city text,
  location_state text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_programs_name ON public.programs(name);
CREATE INDEX IF NOT EXISTS idx_programs_domain ON public.programs(domain);
CREATE INDEX IF NOT EXISTS idx_programs_division ON public.programs(division);

-- 2. Program Memberships table
CREATE TABLE IF NOT EXISTS public.program_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('coach','coordinator','admin')) DEFAULT 'coach',
  invited_by uuid REFERENCES auth.users(id),
  notify_interests boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(program_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_program ON public.program_memberships(program_id);
CREATE INDEX IF NOT EXISTS idx_pm_user ON public.program_memberships(user_id);

-- 3. Outbound Emails table
CREATE TABLE IF NOT EXISTS public.outbound_emails (
  id bigserial PRIMARY KEY,
  template text NOT NULL,
  to_email text NOT NULL,
  to_name text,
  subject text NOT NULL,
  body_text text NOT NULL,
  body_html text,
  meta jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  error text,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_outbound_emails_status ON public.outbound_emails(status) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_outbound_emails_created ON public.outbound_emails(created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_emails ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies if they don't exist

-- Programs: readable by all authenticated users
DO $$ BEGIN
  CREATE POLICY programs_read_all ON public.programs
    FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Program Memberships: users can see their own
DO $$ BEGIN
  CREATE POLICY pm_read_self ON public.program_memberships
    FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY pm_insert_self ON public.program_memberships
    FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
