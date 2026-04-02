
-- 1. Create admins table first
CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 2. Admin check function (security definer)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = _user_id
  )
$$;

-- 3. RLS on admins
CREATE POLICY "Admins can view admins" ON public.admins FOR SELECT USING (public.is_admin(auth.uid()));

-- 4. Duplicate candidates table
CREATE TABLE public.athlete_duplicate_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id_a uuid NOT NULL,
  profile_id_b uuid NOT NULL,
  confidence numeric(3,2) NOT NULL DEFAULT 0.50,
  match_method text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'merged', 'dismissed', 'distinct')),
  resolved_by uuid,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id_a, profile_id_b)
);

ALTER TABLE public.athlete_duplicate_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view duplicate candidates"
  ON public.athlete_duplicate_candidates FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert duplicate candidates"
  ON public.athlete_duplicate_candidates FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update duplicate candidates"
  ON public.athlete_duplicate_candidates FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete duplicate candidates"
  ON public.athlete_duplicate_candidates FOR DELETE
  USING (public.is_admin(auth.uid()));

-- 5. Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_athlete_duplicate_candidates_updated_at
  BEFORE UPDATE ON public.athlete_duplicate_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Indexes
CREATE INDEX idx_duplicate_candidates_status ON public.athlete_duplicate_candidates(status);
CREATE INDEX idx_duplicate_candidates_profile_a ON public.athlete_duplicate_candidates(profile_id_a);
CREATE INDEX idx_duplicate_candidates_profile_b ON public.athlete_duplicate_candidates(profile_id_b);
