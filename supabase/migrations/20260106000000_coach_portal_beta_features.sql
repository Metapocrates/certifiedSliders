-- NCAA Coach Portal Beta Features Migration
-- Adds: coach_watchlist, coach_notes, coach_interest tables

-- ============================================
-- 1. COACH WATCHLIST TABLE
-- ============================================
-- Coaches can save athletes to a personal watchlist

CREATE TABLE IF NOT EXISTS coach_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure one entry per coach-athlete pair
  UNIQUE(coach_user_id, athlete_profile_id)
);

-- Index for fast lookups by coach
CREATE INDEX IF NOT EXISTS idx_coach_watchlist_coach ON coach_watchlist(coach_user_id);

-- Index for checking if athlete is on any watchlist
CREATE INDEX IF NOT EXISTS idx_coach_watchlist_athlete ON coach_watchlist(athlete_profile_id);

-- RLS Policies for coach_watchlist
ALTER TABLE coach_watchlist ENABLE ROW LEVEL SECURITY;

-- Coaches can only see their own watchlist
CREATE POLICY "Coaches see own watchlist" ON coach_watchlist
  FOR SELECT USING (auth.uid() = coach_user_id);

-- Coaches can add to their own watchlist
CREATE POLICY "Coaches add to own watchlist" ON coach_watchlist
  FOR INSERT WITH CHECK (auth.uid() = coach_user_id);

-- Coaches can remove from their own watchlist
CREATE POLICY "Coaches delete from own watchlist" ON coach_watchlist
  FOR DELETE USING (auth.uid() = coach_user_id);

-- Admins have full access
CREATE POLICY "Admins full access watchlist" ON coach_watchlist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- ============================================
-- 2. COACH NOTES TABLE
-- ============================================
-- Private notes coaches can add per athlete

CREATE TABLE IF NOT EXISTS coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast lookups by coach
CREATE INDEX IF NOT EXISTS idx_coach_notes_coach ON coach_notes(coach_user_id);

-- Index for lookups by coach-athlete pair
CREATE INDEX IF NOT EXISTS idx_coach_notes_coach_athlete ON coach_notes(coach_user_id, athlete_profile_id);

-- RLS Policies for coach_notes
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

-- Coaches can only see their own notes
CREATE POLICY "Coaches see own notes" ON coach_notes
  FOR SELECT USING (auth.uid() = coach_user_id);

-- Coaches can add their own notes
CREATE POLICY "Coaches add own notes" ON coach_notes
  FOR INSERT WITH CHECK (auth.uid() = coach_user_id);

-- Coaches can update their own notes
CREATE POLICY "Coaches update own notes" ON coach_notes
  FOR UPDATE USING (auth.uid() = coach_user_id);

-- Coaches can delete their own notes
CREATE POLICY "Coaches delete own notes" ON coach_notes
  FOR DELETE USING (auth.uid() = coach_user_id);

-- Admins have full access
CREATE POLICY "Admins full access notes" ON coach_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_coach_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coach_notes_updated_at ON coach_notes;
CREATE TRIGGER coach_notes_updated_at
  BEFORE UPDATE ON coach_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_coach_notes_updated_at();

-- ============================================
-- 3. COACH INTEREST TABLE
-- ============================================
-- Coaches can express interest in athletes (reverse of athlete_college_interests)

CREATE TABLE IF NOT EXISTS coach_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  athlete_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'expressed' NOT NULL,
  message text, -- Optional message from coach
  created_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure one interest per coach-athlete pair
  UNIQUE(coach_user_id, athlete_profile_id),

  -- Valid status values
  CONSTRAINT valid_coach_interest_status CHECK (status IN ('expressed', 'withdrawn', 'accepted', 'declined'))
);

-- Index for fast lookups by coach
CREATE INDEX IF NOT EXISTS idx_coach_interest_coach ON coach_interest(coach_user_id);

-- Index for athlete to see inbound interest
CREATE INDEX IF NOT EXISTS idx_coach_interest_athlete ON coach_interest(athlete_profile_id);

-- Index for program-level queries
CREATE INDEX IF NOT EXISTS idx_coach_interest_program ON coach_interest(program_id);

-- RLS Policies for coach_interest
ALTER TABLE coach_interest ENABLE ROW LEVEL SECURITY;

-- Coaches can see their own expressed interests
CREATE POLICY "Coaches see own interest" ON coach_interest
  FOR SELECT USING (auth.uid() = coach_user_id);

-- Athletes can see interests expressed in them
CREATE POLICY "Athletes see inbound interest" ON coach_interest
  FOR SELECT USING (
    athlete_profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

-- Coaches can express interest (must be in program membership)
CREATE POLICY "Coaches express interest" ON coach_interest
  FOR INSERT WITH CHECK (
    auth.uid() = coach_user_id
    AND EXISTS (
      SELECT 1 FROM program_memberships
      WHERE user_id = auth.uid()
      AND program_id = coach_interest.program_id
    )
  );

-- Coaches can update their own interest (e.g., withdraw)
CREATE POLICY "Coaches update own interest" ON coach_interest
  FOR UPDATE USING (auth.uid() = coach_user_id);

-- Athletes can update interest status (accept/decline)
CREATE POLICY "Athletes respond to interest" ON coach_interest
  FOR UPDATE USING (
    athlete_profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

-- Coaches can delete their own interest
CREATE POLICY "Coaches delete own interest" ON coach_interest
  FOR DELETE USING (auth.uid() = coach_user_id);

-- Admins have full access
CREATE POLICY "Admins full access interest" ON coach_interest
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- ============================================
-- 4. ATHLETE NOTIFICATIONS TABLE (for interest notifications)
-- ============================================
-- Simple notification queue for athletes

CREATE TABLE IF NOT EXISTS athlete_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'coach_interest', 'result_verified', etc.
  title text NOT NULL,
  body text,
  data jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,

  -- Valid notification types
  CONSTRAINT valid_notification_type CHECK (type IN ('coach_interest', 'result_verified', 'profile_viewed', 'system'))
);

-- Index for athlete's notifications
CREATE INDEX IF NOT EXISTS idx_athlete_notifications_athlete ON athlete_notifications(athlete_profile_id, created_at DESC);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_athlete_notifications_unread ON athlete_notifications(athlete_profile_id) WHERE read_at IS NULL;

-- RLS Policies for athlete_notifications
ALTER TABLE athlete_notifications ENABLE ROW LEVEL SECURITY;

-- Athletes can see their own notifications
CREATE POLICY "Athletes see own notifications" ON athlete_notifications
  FOR SELECT USING (athlete_profile_id = auth.uid());

-- Athletes can mark their notifications as read
CREATE POLICY "Athletes update own notifications" ON athlete_notifications
  FOR UPDATE USING (athlete_profile_id = auth.uid());

-- System can insert notifications (via service role)
CREATE POLICY "System insert notifications" ON athlete_notifications
  FOR INSERT WITH CHECK (true);

-- Admins have full access
CREATE POLICY "Admins full access notifications" ON athlete_notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to get watchlist count for a coach
CREATE OR REPLACE FUNCTION get_coach_watchlist_count(p_coach_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM coach_watchlist
  WHERE coach_user_id = p_coach_user_id;
$$;

-- Function to check if athlete is on coach's watchlist
CREATE OR REPLACE FUNCTION is_on_watchlist(p_coach_user_id uuid, p_athlete_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM coach_watchlist
    WHERE coach_user_id = p_coach_user_id
    AND athlete_profile_id = p_athlete_profile_id
  );
$$;

-- Function to create notification when coach expresses interest
CREATE OR REPLACE FUNCTION notify_athlete_of_coach_interest()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_program_name text;
BEGIN
  -- Get program name
  SELECT name INTO v_program_name
  FROM programs
  WHERE id = NEW.program_id;

  -- Create notification for athlete
  INSERT INTO athlete_notifications (
    athlete_profile_id,
    type,
    title,
    body,
    data
  ) VALUES (
    NEW.athlete_profile_id,
    'coach_interest',
    'New Interest from ' || COALESCE(v_program_name, 'a program'),
    'A coach from ' || COALESCE(v_program_name, 'a program') || ' has expressed interest in your profile.',
    jsonb_build_object(
      'coach_interest_id', NEW.id,
      'program_id', NEW.program_id,
      'program_name', v_program_name
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger to notify athlete when coach expresses interest
DROP TRIGGER IF EXISTS coach_interest_notify ON coach_interest;
CREATE TRIGGER coach_interest_notify
  AFTER INSERT ON coach_interest
  FOR EACH ROW
  WHEN (NEW.status = 'expressed')
  EXECUTE FUNCTION notify_athlete_of_coach_interest();

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, DELETE ON coach_watchlist TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON coach_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON coach_interest TO authenticated;
GRANT SELECT, UPDATE ON athlete_notifications TO authenticated;
GRANT INSERT ON athlete_notifications TO service_role;
