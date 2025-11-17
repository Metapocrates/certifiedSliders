-- High School Coaches Portal
-- Phase 1: Core Schema

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  division TEXT, -- e.g., 'D1', 'D2', etc.
  gender TEXT CHECK (gender IN ('men', 'women', 'coed')),
  logo_url TEXT,
  is_public BOOLEAN DEFAULT false,
  contact_email TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_teams_school_name ON teams(school_name);
CREATE INDEX idx_teams_state ON teams(state);

-- ============================================================================
-- TEAM STAFF TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('head_coach', 'assistant_coach', 'staff')),
  title TEXT, -- e.g., 'Head Coach', 'Distance Coach', etc.
  can_invite_athletes BOOLEAN DEFAULT true,
  can_manage_staff BOOLEAN DEFAULT false,
  can_attest_results BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_staff_team_id ON team_staff(team_id);
CREATE INDEX idx_team_staff_user_id ON team_staff(user_id);
CREATE INDEX idx_team_staff_status ON team_staff(status);

-- ============================================================================
-- TEAM MEMBERSHIPS (ATHLETE ROSTER)
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'alumni', 'transferred', 'removed')),
  jersey_number TEXT,
  specialty_events TEXT[], -- e.g., ['100m', '200m']
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, athlete_id)
);

CREATE INDEX idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX idx_team_memberships_athlete_id ON team_memberships(athlete_id);
CREATE INDEX idx_team_memberships_status ON team_memberships(status);

-- ============================================================================
-- HS COACH → ATHLETE INVITES
-- ============================================================================
CREATE TABLE IF NOT EXISTS hs_coach_athlete_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, athlete_id, status) -- Prevent duplicate pending invites
);

CREATE INDEX idx_hs_coach_athlete_invites_team_id ON hs_coach_athlete_invites(team_id);
CREATE INDEX idx_hs_coach_athlete_invites_athlete_id ON hs_coach_athlete_invites(athlete_id);
CREATE INDEX idx_hs_coach_athlete_invites_status ON hs_coach_athlete_invites(status);
CREATE INDEX idx_hs_coach_athlete_invites_expires_at ON hs_coach_athlete_invites(expires_at);

-- ============================================================================
-- ATHLETE → TEAM JOIN REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS hs_athlete_team_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'withdrawn')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, athlete_id, status) -- Prevent duplicate pending requests
);

CREATE INDEX idx_hs_athlete_team_requests_team_id ON hs_athlete_team_requests(team_id);
CREATE INDEX idx_hs_athlete_team_requests_athlete_id ON hs_athlete_team_requests(athlete_id);
CREATE INDEX idx_hs_athlete_team_requests_status ON hs_athlete_team_requests(status);

-- ============================================================================
-- HS ATTESTATIONS (COACH APPROVAL OF RESULTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hs_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  attester_id UUID NOT NULL REFERENCES auth.users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(result_id) -- One attestation per result
);

CREATE INDEX idx_hs_attestations_result_id ON hs_attestations(result_id);
CREATE INDEX idx_hs_attestations_team_id ON hs_attestations(team_id);
CREATE INDEX idx_hs_attestations_attester_id ON hs_attestations(attester_id);

-- ============================================================================
-- BULK RESULT JOBS (DEFERRED TO v1.1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bulk_result_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id),
  file_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_rows INT DEFAULT 0,
  processed_rows INT DEFAULT 0,
  error_rows INT DEFAULT 0,
  error_log JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_bulk_result_jobs_team_id ON bulk_result_jobs(team_id);
CREATE INDEX idx_bulk_result_jobs_status ON bulk_result_jobs(status);

-- ============================================================================
-- AUDIT LOG (IF NOT EXISTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_action_audit_actor_id ON action_audit(actor_id);
CREATE INDEX idx_action_audit_entity ON action_audit(entity_type, entity_id);
CREATE INDEX idx_action_audit_created_at ON action_audit(created_at);

-- ============================================================================
-- RATE LIMIT BUCKETS (IF NOT EXISTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket_key TEXT NOT NULL, -- e.g., 'hs_invite_athlete:team_id'
  count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, bucket_key, window_start)
);

CREATE INDEX idx_rate_limit_buckets_user_id ON rate_limit_buckets(user_id);
CREATE INDEX idx_rate_limit_buckets_window_end ON rate_limit_buckets(window_end);

-- ============================================================================
-- TEAM METRICS DAILY (MATERIALIZED VIEW)
-- ============================================================================
-- TODO: Populate this via cron job daily
-- DISABLED: Waiting for results table to have status column
/*
CREATE MATERIALIZED VIEW IF NOT EXISTS team_metrics_daily AS
SELECT
  tm.team_id,
  COUNT(DISTINCT tm.athlete_id) AS total_athletes,
  COUNT(DISTINCT CASE WHEN tm.status = 'active' THEN tm.athlete_id END) AS active_athletes,
  COUNT(DISTINCT r.id) AS total_results,
  COUNT(DISTINCT CASE WHEN r.status = 'verified' THEN r.id END) AS verified_results,
  COUNT(DISTINCT CASE WHEN r.meet_date >= (CURRENT_DATE - INTERVAL '30 days') THEN r.id END) AS results_last_30d,
  AVG(CASE WHEN r.status = 'verified' THEN r.confidence END) AS avg_confidence,
  MAX(r.meet_date) AS last_result_date,
  CURRENT_DATE AS snapshot_date
FROM team_memberships tm
LEFT JOIN results r ON r.athlete_id = tm.athlete_id
WHERE tm.status = 'active'
GROUP BY tm.team_id;

CREATE UNIQUE INDEX idx_team_metrics_daily_team_id ON team_metrics_daily(team_id);
*/

-- ============================================================================
-- RLS POLICIES: TEAMS
-- ============================================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Public can view public teams
CREATE POLICY "Public teams are viewable by everyone"
  ON teams FOR SELECT
  USING (is_public = true);

-- Team staff can view their teams
CREATE POLICY "Team staff can view their teams"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = teams.id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
    )
  );

-- HS coaches can create teams
CREATE POLICY "HS coaches can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_type = 'hs_coach'
    )
  );

-- Team staff with manage_staff permission can update their teams
CREATE POLICY "Team staff can update their teams"
  ON teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = teams.id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
        AND team_staff.can_manage_staff = true
    )
  );

-- ============================================================================
-- RLS POLICIES: TEAM STAFF
-- ============================================================================
ALTER TABLE team_staff ENABLE ROW LEVEL SECURITY;

-- Team staff can view their own team's staff
CREATE POLICY "Team staff can view their team's staff"
  ON team_staff FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_staff ts
      WHERE ts.team_id = team_staff.team_id
        AND ts.user_id = auth.uid()
        AND ts.status = 'active'
    )
  );

-- Users can view their own staff records
CREATE POLICY "Users can view their own staff records"
  ON team_staff FOR SELECT
  USING (user_id = auth.uid());

-- Team staff with manage_staff permission can insert new staff
CREATE POLICY "Team staff can invite new staff"
  ON team_staff FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_staff ts
      WHERE ts.team_id = team_staff.team_id
        AND ts.user_id = auth.uid()
        AND ts.status = 'active'
        AND ts.can_manage_staff = true
    )
  );

-- Team staff with manage_staff permission can update staff records
CREATE POLICY "Team staff can manage staff"
  ON team_staff FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_staff ts
      WHERE ts.team_id = team_staff.team_id
        AND ts.user_id = auth.uid()
        AND ts.status = 'active'
        AND ts.can_manage_staff = true
    )
  );

-- ============================================================================
-- RLS POLICIES: TEAM MEMBERSHIPS
-- ============================================================================
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;

-- Public can view memberships of public teams
CREATE POLICY "Public can view public team rosters"
  ON team_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_memberships.team_id
        AND teams.is_public = true
    )
  );

-- Team staff can view their team's roster
CREATE POLICY "Team staff can view their roster"
  ON team_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = team_memberships.team_id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
    )
  );

-- Athletes can view their own memberships
CREATE POLICY "Athletes can view their own memberships"
  ON team_memberships FOR SELECT
  USING (athlete_id = auth.uid());

-- Team staff with invite permission can add athletes
CREATE POLICY "Team staff can add athletes to roster"
  ON team_memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = team_memberships.team_id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
        AND team_staff.can_invite_athletes = true
    )
  );

-- Team staff can update roster records
CREATE POLICY "Team staff can update roster"
  ON team_memberships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = team_memberships.team_id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
    )
  );

-- ============================================================================
-- RLS POLICIES: HS COACH ATHLETE INVITES
-- ============================================================================
ALTER TABLE hs_coach_athlete_invites ENABLE ROW LEVEL SECURITY;

-- Team staff can view their team's invites
CREATE POLICY "Team staff can view their invites"
  ON hs_coach_athlete_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = hs_coach_athlete_invites.team_id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
    )
  );

-- Athletes can view invites sent to them
CREATE POLICY "Athletes can view invites sent to them"
  ON hs_coach_athlete_invites FOR SELECT
  USING (athlete_id = auth.uid());

-- Team staff with invite permission can create invites
CREATE POLICY "Team staff can invite athletes"
  ON hs_coach_athlete_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = hs_coach_athlete_invites.team_id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
        AND team_staff.can_invite_athletes = true
    )
    AND inviter_id = auth.uid()
  );

-- Athletes can update their own invites (accept/decline)
CREATE POLICY "Athletes can respond to invites"
  ON hs_coach_athlete_invites FOR UPDATE
  USING (athlete_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: HS ATHLETE TEAM REQUESTS
-- ============================================================================
ALTER TABLE hs_athlete_team_requests ENABLE ROW LEVEL SECURITY;

-- Team staff can view requests to their team
CREATE POLICY "Team staff can view join requests"
  ON hs_athlete_team_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = hs_athlete_team_requests.team_id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
    )
  );

-- Athletes can view their own requests
CREATE POLICY "Athletes can view their own requests"
  ON hs_athlete_team_requests FOR SELECT
  USING (athlete_id = auth.uid());

-- Athletes can create join requests
CREATE POLICY "Athletes can request to join teams"
  ON hs_athlete_team_requests FOR INSERT
  WITH CHECK (
    athlete_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_type = 'athlete'
    )
  );

-- Athletes can withdraw their own requests
CREATE POLICY "Athletes can withdraw their requests"
  ON hs_athlete_team_requests FOR UPDATE
  USING (athlete_id = auth.uid())
  WITH CHECK (status = 'withdrawn');

-- Team staff can approve/deny requests
CREATE POLICY "Team staff can review requests"
  ON hs_athlete_team_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = hs_athlete_team_requests.team_id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
        AND team_staff.can_invite_athletes = true
    )
  );

-- ============================================================================
-- RLS POLICIES: HS ATTESTATIONS
-- ============================================================================
ALTER TABLE hs_attestations ENABLE ROW LEVEL SECURITY;

-- Team staff can view attestations for their team's athletes
CREATE POLICY "Team staff can view their attestations"
  ON hs_attestations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = hs_attestations.team_id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
    )
  );

-- Team staff with attest permission can create attestations
CREATE POLICY "Team staff can attest results"
  ON hs_attestations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = hs_attestations.team_id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
        AND team_staff.can_attest_results = true
    )
    AND attester_id = auth.uid()
  );

-- ============================================================================
-- RLS POLICIES: BULK RESULT JOBS
-- ============================================================================
ALTER TABLE bulk_result_jobs ENABLE ROW LEVEL SECURITY;

-- Team staff can view their team's jobs
CREATE POLICY "Team staff can view bulk jobs"
  ON bulk_result_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = bulk_result_jobs.team_id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
    )
  );

-- Team staff can create bulk jobs
CREATE POLICY "Team staff can create bulk jobs"
  ON bulk_result_jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = bulk_result_jobs.team_id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
    )
    AND uploader_id = auth.uid()
  );

-- ============================================================================
-- RLS POLICIES: TEAM METRICS DAILY
-- ============================================================================
-- DISABLED: Waiting for team_metrics_daily materialized view to be created
/*
ALTER MATERIALIZED VIEW team_metrics_daily OWNER TO postgres;

-- Team staff can view their team's metrics
CREATE POLICY "Team staff can view metrics"
  ON team_metrics_daily FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_staff
      WHERE team_staff.team_id = team_metrics_daily.team_id
        AND team_staff.user_id = auth.uid()
        AND team_staff.status = 'active'
    )
  );
*/

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is team staff
CREATE OR REPLACE FUNCTION is_team_staff(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_staff
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's team role
CREATE OR REPLACE FUNCTION get_team_role(p_team_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM team_staff
  WHERE team_id = p_team_id
    AND user_id = p_user_id
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_bucket_key TEXT,
  p_max_count INT,
  p_window_hours INT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INT;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
BEGIN
  v_window_start := now() - (p_window_hours || ' hours')::INTERVAL;
  v_window_end := now();

  -- Get current count in window
  SELECT COALESCE(SUM(count), 0) INTO v_current_count
  FROM rate_limit_buckets
  WHERE user_id = p_user_id
    AND bucket_key = p_bucket_key
    AND window_end > v_window_start;

  -- Check if under limit
  IF v_current_count < p_max_count THEN
    -- Insert new bucket entry
    INSERT INTO rate_limit_buckets (user_id, bucket_key, count, window_start, window_end)
    VALUES (p_user_id, p_bucket_key, 1, v_window_start, v_window_end)
    ON CONFLICT (user_id, bucket_key, window_start)
    DO UPDATE SET count = rate_limit_buckets.count + 1;

    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_staff_updated_at
  BEFORE UPDATE ON team_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_memberships_updated_at
  BEFORE UPDATE ON team_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hs_coach_athlete_invites_updated_at
  BEFORE UPDATE ON hs_coach_athlete_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hs_athlete_team_requests_updated_at
  BEFORE UPDATE ON hs_athlete_team_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
