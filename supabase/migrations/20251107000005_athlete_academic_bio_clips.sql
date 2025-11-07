-- ============================================
-- ATHLETE ACADEMIC INFO, BIO VISIBILITY, VIDEO CLIPS
-- Adds academic data, bio privacy controls, and YouTube clips
-- ============================================

-- 1. Athlete Academic Info (private, opt-in sharing with coaches)
CREATE TABLE IF NOT EXISTS public.athlete_academic_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  gpa numeric(3,2) CHECK (gpa >= 0 AND gpa <= 4.0),  -- 0.00 to 4.00
  sat_score int CHECK (sat_score >= 400 AND sat_score <= 1600),
  act_score int CHECK (act_score >= 1 AND act_score <= 36),
  share_with_coaches boolean DEFAULT false,  -- Opt-in to share with verified coaches
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_athlete_academic_athlete ON public.athlete_academic_info(athlete_id);

COMMENT ON TABLE public.athlete_academic_info IS 'Academic information (GPA, SAT, ACT) with athlete-controlled sharing';
COMMENT ON COLUMN public.athlete_academic_info.share_with_coaches IS 'When true, verified coaches can see this data';


-- 2. Bio Visibility (extend profiles table)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio_visibility text CHECK (bio_visibility IN ('private', 'coaches', 'public')) DEFAULT 'private';

COMMENT ON COLUMN public.profiles.bio_visibility IS 'Controls who can see athlete bio: private (athlete only), coaches (verified coaches), public (everyone)';


-- 3. Contact Info Columns (add if missing)
-- Email and phone should already exist, but add them just in case
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS share_contact_info boolean DEFAULT false;

COMMENT ON COLUMN public.profiles.share_contact_info IS 'When true, contact info is visible to verified coaches';


-- 4. YouTube Video Clips
CREATE TABLE IF NOT EXISTS public.athlete_video_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  youtube_url text NOT NULL,  -- Full YouTube URL
  youtube_id text,  -- Extracted video ID for embedding
  event_code text,  -- Optional: link to specific event (e.g., '400m')
  title text,  -- Optional: custom title from athlete
  display_order int DEFAULT 0,  -- For ordering clips
  is_archived boolean DEFAULT false,  -- Archive old clips instead of deleting
  flagged_at timestamptz,  -- When content was flagged
  flagged_by uuid REFERENCES auth.users(id),  -- Who flagged it
  flag_reason text,  -- Optional reason for flag
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(athlete_id, youtube_url)
);

CREATE INDEX idx_athlete_clips_athlete ON public.athlete_video_clips(athlete_id);
CREATE INDEX idx_athlete_clips_event ON public.athlete_video_clips(event_code);
CREATE INDEX idx_athlete_clips_flagged ON public.athlete_video_clips(flagged_at) WHERE flagged_at IS NOT NULL;

COMMENT ON TABLE public.athlete_video_clips IS 'YouTube video clips for athlete profiles, linked to events';
COMMENT ON COLUMN public.athlete_video_clips.is_archived IS 'Limit to 5 active clips, archive older ones';
COMMENT ON COLUMN public.athlete_video_clips.flagged_at IS 'Flagged for review by admins';


-- 5. Bio Flagging (extend profiles table)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio_flagged_at timestamptz,
  ADD COLUMN IF NOT EXISTS bio_flagged_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS bio_flag_reason text;

COMMENT ON COLUMN public.profiles.bio_flagged_at IS 'When bio was flagged for offensive content';


-- ============================================
-- RLS POLICIES
-- ============================================

-- Academic Info: athlete can CRUD their own, coaches can read if shared
ALTER TABLE public.athlete_academic_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY academic_athlete_manage ON public.athlete_academic_info
  FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Coaches can read if athlete opted to share
CREATE POLICY academic_coaches_read ON public.athlete_academic_info
  FOR SELECT
  USING (
    share_with_coaches = true
    AND EXISTS (
      SELECT 1 FROM public.program_memberships pm
      JOIN public.athlete_college_interests aci ON aci.program_id = pm.program_id
      WHERE pm.user_id = auth.uid()
        AND aci.athlete_id = athlete_academic_info.athlete_id
    )
  );


-- Video Clips: athlete can CRUD their own, public can read non-flagged
ALTER TABLE public.athlete_video_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY clips_athlete_manage ON public.athlete_video_clips
  FOR ALL
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- Public can view non-flagged, non-archived clips
CREATE POLICY clips_public_read ON public.athlete_video_clips
  FOR SELECT
  USING (
    is_archived = false
    AND flagged_at IS NULL
  );

-- Admins can see all clips
CREATE POLICY clips_admin_read ON public.athlete_video_clips
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );


-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Limit athlete to 5 active (non-archived) clips
CREATE OR REPLACE FUNCTION enforce_clip_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When inserting a new clip, check if athlete already has 5+ active clips
  IF TG_OP = 'INSERT' AND NEW.is_archived = false THEN
    DECLARE
      active_count int;
    BEGIN
      SELECT COUNT(*) INTO active_count
      FROM public.athlete_video_clips
      WHERE athlete_id = NEW.athlete_id
        AND is_archived = false;

      -- If already at 5, archive the oldest clip
      IF active_count >= 5 THEN
        UPDATE public.athlete_video_clips
        SET is_archived = true
        WHERE id = (
          SELECT id FROM public.athlete_video_clips
          WHERE athlete_id = NEW.athlete_id
            AND is_archived = false
          ORDER BY created_at ASC
          LIMIT 1
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_enforce_clip_limit
BEFORE INSERT ON public.athlete_video_clips
FOR EACH ROW
EXECUTE FUNCTION enforce_clip_limit();

COMMENT ON FUNCTION enforce_clip_limit IS 'Auto-archives oldest clip when athlete has 5+ active clips';


-- Extract YouTube ID from URL
CREATE OR REPLACE FUNCTION extract_youtube_id(url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Handle youtu.be/VIDEO_ID
  IF url ~ 'youtu\.be/' THEN
    RETURN substring(url from 'youtu\.be/([a-zA-Z0-9_-]+)');
  END IF;

  -- Handle youtube.com/watch?v=VIDEO_ID
  IF url ~ 'youtube\.com/watch\?v=' THEN
    RETURN substring(url from 'v=([a-zA-Z0-9_-]+)');
  END IF;

  -- Handle youtube.com/embed/VIDEO_ID
  IF url ~ 'youtube\.com/embed/' THEN
    RETURN substring(url from 'embed/([a-zA-Z0-9_-]+)');
  END IF;

  RETURN NULL;
END;
$$;

-- Auto-extract YouTube ID on insert/update
CREATE OR REPLACE FUNCTION auto_extract_youtube_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.youtube_id := extract_youtube_id(NEW.youtube_url);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_extract_youtube_id
BEFORE INSERT OR UPDATE ON public.athlete_video_clips
FOR EACH ROW
EXECUTE FUNCTION auto_extract_youtube_id();

COMMENT ON FUNCTION extract_youtube_id IS 'Extracts video ID from YouTube URL for embedding';


-- ============================================
-- UPDATE RPC FUNCTIONS
-- ============================================

-- Drop and recreate RPC to include academic info (can't change return type in-place)
DROP FUNCTION IF EXISTS rpc_get_athlete_detail_for_coach(uuid, uuid);

-- Update athlete detail RPC to include academic info and video clips
CREATE FUNCTION rpc_get_athlete_detail_for_coach(
  _athlete_id uuid,
  _program_id uuid
) RETURNS TABLE (
  athlete_id uuid,
  profile_id text,
  full_name text,
  username text,
  class_year int,
  school_name text,
  school_state text,
  star_rating int,
  profile_verified boolean,
  profile_pic_url text,
  bio text,
  bio_visibility text,
  intent text,
  share_contact boolean,
  share_email boolean,
  share_phone boolean,
  email text,
  phone text,
  interest_note text,
  -- Academic info (only if shared)
  gpa numeric,
  sat_score int,
  act_score int,
  academic_shared boolean
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    p.id,
    p.profile_id,
    p.full_name,
    p.username,
    p.class_year,
    p.school_name,
    p.school_state,
    p.star_rating,
    EXISTS(
      SELECT 1 FROM public.external_identities ei
      WHERE ei.user_id = p.id
        AND ei.verified = true
    ) as profile_verified,
    p.profile_pic_url,
    p.bio,
    p.bio_visibility,
    aci.intent,
    aci.share_contact,
    aci.share_email,
    aci.share_phone,
    CASE
      WHEN p.share_contact_info = true AND aci.share_email = true THEN p.email
      ELSE NULL
    END as email,
    CASE
      WHEN p.share_contact_info = true AND aci.share_phone = true THEN p.phone
      ELSE NULL
    END as phone,
    aci.note,
    -- Academic info (only if athlete opted to share)
    CASE WHEN aai.share_with_coaches = true THEN aai.gpa ELSE NULL END as gpa,
    CASE WHEN aai.share_with_coaches = true THEN aai.sat_score ELSE NULL END as sat_score,
    CASE WHEN aai.share_with_coaches = true THEN aai.act_score ELSE NULL END as act_score,
    COALESCE(aai.share_with_coaches, false) as academic_shared
  FROM public.profiles p
  JOIN public.athlete_college_interests aci ON aci.athlete_id = p.id
  LEFT JOIN public.athlete_academic_info aai ON aai.athlete_id = p.id
  WHERE p.id = _athlete_id
    AND aci.program_id = _program_id
    AND aci.intent IN ('interested', 'commit')
    -- Verify caller has access to this program
    AND EXISTS (
      SELECT 1 FROM public.program_memberships pm
      WHERE pm.program_id = _program_id
        AND pm.user_id = auth.uid()
    );
$$;

COMMENT ON FUNCTION rpc_get_athlete_detail_for_coach IS 'Gets athlete profile for coach portal, including academic info if shared';
