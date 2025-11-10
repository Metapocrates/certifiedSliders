-- ============================================
-- COACH PORTAL: EMAIL NOTIFICATIONS
-- Add notification preferences and email queue
-- ============================================

-- 1. Add notification opt-out flag for coaches (default on)
ALTER TABLE public.program_memberships
  ADD COLUMN IF NOT EXISTS notify_interests boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.program_memberships.notify_interests IS 'Whether coach wants email notifications for new athlete interests';


-- 2. Lightweight email queue
CREATE TABLE IF NOT EXISTS public.outbound_emails (
  id bigserial PRIMARY KEY,
  template text NOT NULL,                -- 'interest_new', 'weekly_digest', etc.
  to_email text NOT NULL,
  to_name text,
  subject text NOT NULL,
  body_text text NOT NULL,
  body_html text,
  meta jsonb DEFAULT '{}'::jsonb,        -- Additional context (program_id, athlete_id, etc.)
  status text NOT NULL DEFAULT 'queued', -- queued|sent|failed
  error text,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX idx_outbound_emails_status ON public.outbound_emails(status) WHERE status = 'queued';
CREATE INDEX idx_outbound_emails_created ON public.outbound_emails(created_at DESC);

COMMENT ON TABLE public.outbound_emails IS 'Email queue for async sending via edge function';
COMMENT ON COLUMN public.outbound_emails.template IS 'Email template identifier';
COMMENT ON COLUMN public.outbound_emails.meta IS 'JSON context for logging and debugging';


-- 3. RLS for email queue (only service role should access)
ALTER TABLE public.outbound_emails ENABLE ROW LEVEL SECURITY;

-- No user policies - only service role via edge functions
-- Service role bypasses RLS automatically


-- 4. Trigger: Enqueue emails when athlete expresses interest
CREATE OR REPLACE FUNCTION public.enqueue_interest_emails()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prog uuid := NEW.program_id;
  v_ath  uuid := NEW.athlete_id;
  rec record;
  v_name text;
  v_stars int;
  v_school text;
  v_profile_id text;
  v_site_url text;
  v_subject text;
  v_text text;
BEGIN
  -- Only send for new interests in active programs
  IF NEW.program_id IS NULL OR NEW.intent NOT IN ('interested', 'commit') THEN
    RETURN NEW;
  END IF;

  -- Get athlete info
  SELECT p.full_name, p.star_rating, p.school_name, p.profile_id
    INTO v_name, v_stars, v_school, v_profile_id
  FROM public.profiles p WHERE p.id = v_ath;

  -- Get site URL from settings (fallback to env var if not set)
  BEGIN
    v_site_url := current_setting('app.settings.public_url', true);
  EXCEPTION
    WHEN OTHERS THEN
      v_site_url := 'https://certifiedsliders.com';
  END;

  IF v_site_url IS NULL OR v_site_url = '' THEN
    v_site_url := 'https://certifiedsliders.com';
  END IF;

  -- Build email content
  v_subject := format('New athlete interest: %s (%s★) — %s',
    COALESCE(v_name, 'Athlete'),
    COALESCE(v_stars, 0),
    COALESCE(v_school, '')
  );

  v_text := format($MSG$A new athlete has expressed interest in your program.

Name: %s
Stars: %s
School: %s
Profile: %s

View in portal:
%s/coach/portal/athletes/%s

You're receiving this because notifications are enabled for your program membership.
To stop these emails, disable notifications in your Coach Settings.

---
Certified Sliders
$MSG$,
    COALESCE(v_name, 'Unknown'),
    COALESCE(v_stars, 0),
    COALESCE(v_school, 'Unknown'),
    COALESCE(v_profile_id, ''),
    v_site_url,
    COALESCE(v_profile_id, '')
  );

  -- Enqueue email for each coach in the program who has notifications enabled
  FOR rec IN
    SELECT u.email as to_email,
           COALESCE(up.full_name, 'Coach') as to_name
    FROM public.program_memberships pm
    JOIN auth.users u ON u.id = pm.user_id
    LEFT JOIN public.profiles up ON up.id = pm.user_id
    WHERE pm.program_id = v_prog
      AND pm.notify_interests = true
      AND u.email IS NOT NULL
  LOOP
    INSERT INTO public.outbound_emails(template, to_email, to_name, subject, body_text, meta)
    VALUES (
      'interest_new',
      rec.to_email,
      rec.to_name,
      v_subject,
      v_text,
      jsonb_build_object(
        'program_id', v_prog,
        'athlete_id', v_ath,
        'athlete_name', v_name,
        'athlete_stars', v_stars,
        'athlete_profile_id', v_profile_id
      )
    );
  END LOOP;

  RETURN NEW;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_enqueue_interest_emails ON public.athlete_college_interests;

-- Create trigger
CREATE TRIGGER trg_enqueue_interest_emails
AFTER INSERT ON public.athlete_college_interests
FOR EACH ROW EXECUTE FUNCTION public.enqueue_interest_emails();

COMMENT ON FUNCTION public.enqueue_interest_emails IS 'Automatically enqueue emails when athlete expresses interest';
