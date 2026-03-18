-- ============================================================
-- FIX: Supabase Database Linter warnings
-- 1. Convert SECURITY DEFINER views to SECURITY INVOKER
-- 2. Enable RLS on tables missing it
-- ============================================================

-- ============================================================
-- PART 1: Fix SECURITY DEFINER views
-- Convert to SECURITY INVOKER so RLS of the querying user applies
-- ============================================================

-- v_rating_inputs — admin rating tool; underlying tables have RLS
ALTER VIEW IF EXISTS public.v_rating_inputs SET (security_invoker = on);

-- v_pending_rating_reviews — admin review queue
ALTER VIEW IF EXISTS public.v_pending_rating_reviews SET (security_invoker = on);

-- v_athlete_interests_offers — athlete interest/offer data
ALTER VIEW IF EXISTS public.v_athlete_interests_offers SET (security_invoker = on);

-- v_ncaa_schools_tf — public NCAA school directory
ALTER VIEW IF EXISTS public.v_ncaa_schools_tf SET (security_invoker = on);


-- ============================================================
-- PART 2: Enable RLS on tables missing it
-- Each table gets RLS enabled + appropriate policies
-- ============================================================

-- -------------------------------------------------------
-- locations (reference/lookup data — public read, admin write)
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.locations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'locations') THEN
    CREATE POLICY "Anyone can read locations"
      ON public.locations FOR SELECT
      USING (true);

    CREATE POLICY "Admins can manage locations"
      ON public.locations FOR ALL
      USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
  END IF;
END $$;

-- -------------------------------------------------------
-- events (reference data — public read, admin write)
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
    CREATE POLICY "Anyone can read events"
      ON public.events FOR SELECT
      USING (true);

    CREATE POLICY "Admins can manage events"
      ON public.events FOR ALL
      USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
  END IF;
END $$;

-- -------------------------------------------------------
-- admin_users (legacy admin table — admin only)
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
    CREATE POLICY "Admins can read admin_users"
      ON public.admin_users FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
  END IF;
END $$;

-- -------------------------------------------------------
-- audit_events (admin audit trail — admin read, system write)
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.audit_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_events') THEN
    CREATE POLICY "Admins can read audit_events"
      ON public.audit_events FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

    CREATE POLICY "Authenticated users can insert audit_events"
      ON public.audit_events FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- -------------------------------------------------------
-- stars_history (rating change log — admin read, system write)
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.stars_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stars_history') THEN
    CREATE POLICY "Admins can read stars_history"
      ON public.stars_history FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

    CREATE POLICY "Admins can insert stars_history"
      ON public.stars_history FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
  END IF;
END $$;

-- -------------------------------------------------------
-- rating_history (rating audit — admin only)
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.rating_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rating_history') THEN
    CREATE POLICY "Admins can read rating_history"
      ON public.rating_history FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

    CREATE POLICY "Admins can insert rating_history"
      ON public.rating_history FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
  END IF;
END $$;

-- -------------------------------------------------------
-- ratings_history (rating audit — admin only)
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.ratings_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ratings_history') THEN
    CREATE POLICY "Admins can read ratings_history"
      ON public.ratings_history FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

    CREATE POLICY "Admins can insert ratings_history"
      ON public.ratings_history FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
  END IF;
END $$;

-- -------------------------------------------------------
-- ratings_standards_grade (public read, admin write — RLS may already exist)
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.ratings_standards_grade ENABLE ROW LEVEL SECURITY;

-- Add public read policy if not already present
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ratings_standards_grade')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'ratings_standards_grade'
         AND policyname = 'Anyone can read ratings_standards_grade'
     ) THEN
    CREATE POLICY "Anyone can read ratings_standards_grade"
      ON public.ratings_standards_grade FOR SELECT
      USING (true);
  END IF;
END $$;

-- -------------------------------------------------------
-- ratings_standards_grade_staging (admin only)
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.ratings_standards_grade_staging ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ratings_standards_grade_staging') THEN
    CREATE POLICY "Admins can manage ratings_standards_grade_staging"
      ON public.ratings_standards_grade_staging FOR ALL
      USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
  END IF;
END $$;

-- -------------------------------------------------------
-- reports (if this is a standalone table separate from result_reports)
-- -------------------------------------------------------
ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reports') THEN
    -- Users can read their own reports
    CREATE POLICY "Users can read own reports"
      ON public.reports FOR SELECT
      USING (auth.uid() IS NOT NULL);

    -- Authenticated users can create reports
    CREATE POLICY "Authenticated users can create reports"
      ON public.reports FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);

    -- Admins can manage all reports
    CREATE POLICY "Admins can manage reports"
      ON public.reports FOR ALL
      USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
  END IF;
END $$;
