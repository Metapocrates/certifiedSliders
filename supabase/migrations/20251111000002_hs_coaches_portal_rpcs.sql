-- High School Coaches Portal
-- Phase 2: RPC Functions

-- ============================================================================
-- RPC: GET TEAM ROSTER WITH DETAILS
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_get_team_roster(
  p_team_id UUID,
  p_status TEXT DEFAULT 'active'
)
RETURNS TABLE (
  athlete_id UUID,
  full_name TEXT,
  username TEXT,
  profile_id TEXT,
  school_name TEXT,
  class_year INT,
  gender TEXT,
  profile_pic_url TEXT,
  jersey_number TEXT,
  specialty_events TEXT[],
  joined_at TIMESTAMPTZ,
  status TEXT,
  total_results BIGINT,
  verified_results BIGINT,
  last_result_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.athlete_id,
    p.full_name,
    p.username,
    p.profile_id,
    p.school_name,
    p.class_year,
    p.gender,
    p.profile_pic_url,
    tm.jersey_number,
    tm.specialty_events,
    tm.joined_at,
    tm.status,
    COUNT(DISTINCT r.id) AS total_results,
    COUNT(DISTINCT CASE WHEN r.status = 'verified' THEN r.id END) AS verified_results,
    MAX(r.meet_date) AS last_result_date
  FROM team_memberships tm
  JOIN profiles p ON p.id = tm.athlete_id
  LEFT JOIN results r ON r.athlete_id = tm.athlete_id
  WHERE tm.team_id = p_team_id
    AND (p_status IS NULL OR tm.status = p_status)
  GROUP BY
    tm.athlete_id,
    p.full_name,
    p.username,
    p.profile_id,
    p.school_name,
    p.class_year,
    p.gender,
    p.profile_pic_url,
    tm.jersey_number,
    tm.specialty_events,
    tm.joined_at,
    tm.status
  ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: GET PENDING INVITES FOR TEAM
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_get_team_pending_invites(
  p_team_id UUID
)
RETURNS TABLE (
  invite_id UUID,
  athlete_id UUID,
  athlete_name TEXT,
  athlete_username TEXT,
  athlete_profile_id TEXT,
  inviter_name TEXT,
  message TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id AS invite_id,
    i.athlete_id,
    p.full_name AS athlete_name,
    p.username AS athlete_username,
    p.profile_id AS athlete_profile_id,
    inviter.full_name AS inviter_name,
    i.message,
    i.created_at,
    i.expires_at
  FROM hs_coach_athlete_invites i
  JOIN profiles p ON p.id = i.athlete_id
  LEFT JOIN profiles inviter ON inviter.id = i.inviter_id
  WHERE i.team_id = p_team_id
    AND i.status = 'pending'
    AND i.expires_at > now()
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: GET PENDING JOIN REQUESTS FOR TEAM
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_get_team_pending_requests(
  p_team_id UUID
)
RETURNS TABLE (
  request_id UUID,
  athlete_id UUID,
  athlete_name TEXT,
  athlete_username TEXT,
  athlete_profile_id TEXT,
  athlete_school TEXT,
  athlete_class_year INT,
  message TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id AS request_id,
    r.athlete_id,
    p.full_name AS athlete_name,
    p.username AS athlete_username,
    p.profile_id AS athlete_profile_id,
    p.school_name AS athlete_school,
    p.class_year AS athlete_class_year,
    r.message,
    r.created_at
  FROM hs_athlete_team_requests r
  JOIN profiles p ON p.id = r.athlete_id
  WHERE r.team_id = p_team_id
    AND r.status = 'pending'
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: GET ATTESTATION QUEUE FOR TEAM
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_get_team_attestation_queue(
  p_team_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  result_id INT,
  athlete_id UUID,
  athlete_name TEXT,
  athlete_profile_id TEXT,
  event TEXT,
  mark TEXT,
  meet_name TEXT,
  meet_date DATE,
  season TEXT,
  proof_url TEXT,
  submitted_at TIMESTAMPTZ,
  already_attested BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id AS result_id,
    r.athlete_id,
    p.full_name AS athlete_name,
    p.profile_id AS athlete_profile_id,
    r.event,
    r.mark,
    r.meet_name,
    r.meet_date,
    r.season,
    r.proof_url,
    r.created_at AS submitted_at,
    EXISTS (
      SELECT 1 FROM hs_attestations
      WHERE hs_attestations.result_id = r.id
    ) AS already_attested
  FROM results r
  JOIN team_memberships tm ON tm.athlete_id = r.athlete_id
  JOIN profiles p ON p.id = r.athlete_id
  WHERE tm.team_id = p_team_id
    AND tm.status = 'active'
    AND r.status IN ('pending', 'manual_review')
    AND NOT EXISTS (
      SELECT 1 FROM hs_attestations
      WHERE hs_attestations.result_id = r.id
    )
  ORDER BY r.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: GET TEAM RESULTS
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_get_team_results(
  p_team_id UUID,
  p_athlete_id UUID DEFAULT NULL,
  p_event TEXT DEFAULT NULL,
  p_season TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  result_id INT,
  athlete_id UUID,
  athlete_name TEXT,
  athlete_profile_id TEXT,
  event TEXT,
  mark TEXT,
  meet_name TEXT,
  meet_date DATE,
  season TEXT,
  status TEXT,
  confidence INT,
  wind NUMERIC,
  proof_url TEXT,
  is_attested BOOLEAN,
  attested_by TEXT,
  attested_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id AS result_id,
    r.athlete_id,
    p.full_name AS athlete_name,
    p.profile_id AS athlete_profile_id,
    r.event,
    r.mark,
    r.meet_name,
    r.meet_date,
    r.season,
    r.status,
    r.confidence,
    r.wind,
    r.proof_url,
    (att.id IS NOT NULL) AS is_attested,
    attester.full_name AS attested_by,
    att.created_at AS attested_at
  FROM results r
  JOIN team_memberships tm ON tm.athlete_id = r.athlete_id
  JOIN profiles p ON p.id = r.athlete_id
  LEFT JOIN hs_attestations att ON att.result_id = r.id
  LEFT JOIN profiles attester ON attester.id = att.attester_id
  WHERE tm.team_id = p_team_id
    AND (p_athlete_id IS NULL OR r.athlete_id = p_athlete_id)
    AND (p_event IS NULL OR r.event = p_event)
    AND (p_season IS NULL OR r.season = p_season)
    AND (p_status IS NULL OR r.status = p_status)
  ORDER BY r.meet_date DESC, r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: GET TEAM ANALYTICS
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_get_team_analytics(
  p_team_id UUID
)
RETURNS TABLE (
  total_athletes INT,
  active_athletes INT,
  total_results INT,
  verified_results INT,
  results_last_30d INT,
  avg_confidence NUMERIC,
  last_result_date DATE,
  pending_attestations INT,
  pending_invites INT,
  pending_requests INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(metrics.total_athletes, 0)::INT,
    COALESCE(metrics.active_athletes, 0)::INT,
    COALESCE(metrics.total_results, 0)::INT,
    COALESCE(metrics.verified_results, 0)::INT,
    COALESCE(metrics.results_last_30d, 0)::INT,
    COALESCE(metrics.avg_confidence, 0)::NUMERIC,
    metrics.last_result_date,
    COALESCE(pending_att.count, 0)::INT AS pending_attestations,
    COALESCE(pending_inv.count, 0)::INT AS pending_invites,
    COALESCE(pending_req.count, 0)::INT AS pending_requests
  FROM team_metrics_daily metrics
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM results r
    JOIN team_memberships tm ON tm.athlete_id = r.athlete_id
    WHERE tm.team_id = p_team_id
      AND tm.status = 'active'
      AND r.status IN ('pending', 'manual_review')
      AND NOT EXISTS (
        SELECT 1 FROM hs_attestations WHERE hs_attestations.result_id = r.id
      )
  ) pending_att ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM hs_coach_athlete_invites
    WHERE team_id = p_team_id
      AND status = 'pending'
      AND expires_at > now()
  ) pending_inv ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM hs_athlete_team_requests
    WHERE team_id = p_team_id
      AND status = 'pending'
  ) pending_req ON true
  WHERE metrics.team_id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: SEARCH ATHLETES FOR INVITE
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_search_athletes_for_invite(
  p_team_id UUID,
  p_search TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  athlete_id UUID,
  full_name TEXT,
  username TEXT,
  profile_id TEXT,
  school_name TEXT,
  class_year INT,
  gender TEXT,
  profile_pic_url TEXT,
  already_on_roster BOOLEAN,
  has_pending_invite BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS athlete_id,
    p.full_name,
    p.username,
    p.profile_id,
    p.school_name,
    p.class_year,
    p.gender,
    p.profile_pic_url,
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_memberships.team_id = p_team_id
        AND team_memberships.athlete_id = p.id
        AND team_memberships.status = 'active'
    ) AS already_on_roster,
    EXISTS (
      SELECT 1 FROM hs_coach_athlete_invites
      WHERE hs_coach_athlete_invites.team_id = p_team_id
        AND hs_coach_athlete_invites.athlete_id = p.id
        AND hs_coach_athlete_invites.status = 'pending'
        AND hs_coach_athlete_invites.expires_at > now()
    ) AS has_pending_invite
  FROM profiles p
  WHERE p.user_type = 'athlete'
    AND p.status = 'active'
    AND p.profile_id IS NOT NULL
    AND (
      p.full_name ILIKE '%' || p_search || '%'
      OR p.username ILIKE '%' || p_search || '%'
      OR p.profile_id ILIKE '%' || p_search || '%'
    )
  ORDER BY p.full_name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: GET USER'S TEAMS
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_get_user_teams(
  p_user_id UUID
)
RETURNS TABLE (
  team_id UUID,
  school_name TEXT,
  city TEXT,
  state TEXT,
  division TEXT,
  gender TEXT,
  logo_url TEXT,
  is_public BOOLEAN,
  role TEXT,
  title TEXT,
  can_invite_athletes BOOLEAN,
  can_manage_staff BOOLEAN,
  can_attest_results BOOLEAN,
  total_athletes INT,
  pending_attestations INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS team_id,
    t.school_name,
    t.city,
    t.state,
    t.division,
    t.gender,
    t.logo_url,
    t.is_public,
    ts.role,
    ts.title,
    ts.can_invite_athletes,
    ts.can_manage_staff,
    ts.can_attest_results,
    COALESCE(roster_count.count, 0)::INT AS total_athletes,
    COALESCE(pending_att.count, 0)::INT AS pending_attestations
  FROM team_staff ts
  JOIN teams t ON t.id = ts.team_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM team_memberships
    WHERE team_memberships.team_id = t.id
      AND team_memberships.status = 'active'
  ) roster_count ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM results r
    JOIN team_memberships tm ON tm.athlete_id = r.athlete_id
    WHERE tm.team_id = t.id
      AND tm.status = 'active'
      AND r.status IN ('pending', 'manual_review')
      AND NOT EXISTS (
        SELECT 1 FROM hs_attestations WHERE hs_attestations.result_id = r.id
      )
  ) pending_att ON true
  WHERE ts.user_id = p_user_id
    AND ts.status = 'active'
  ORDER BY t.school_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: GET ATHLETE'S TEAM INVITES
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_get_athlete_team_invites(
  p_athlete_id UUID
)
RETURNS TABLE (
  invite_id UUID,
  team_id UUID,
  school_name TEXT,
  city TEXT,
  state TEXT,
  gender TEXT,
  logo_url TEXT,
  inviter_name TEXT,
  message TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id AS invite_id,
    t.id AS team_id,
    t.school_name,
    t.city,
    t.state,
    t.gender,
    t.logo_url,
    inviter.full_name AS inviter_name,
    i.message,
    i.created_at,
    i.expires_at
  FROM hs_coach_athlete_invites i
  JOIN teams t ON t.id = i.team_id
  LEFT JOIN profiles inviter ON inviter.id = i.inviter_id
  WHERE i.athlete_id = p_athlete_id
    AND i.status = 'pending'
    AND i.expires_at > now()
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: GET PUBLIC TEAMS (FOR ATHLETE SEARCH)
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_search_public_teams(
  p_search TEXT,
  p_state TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  team_id UUID,
  school_name TEXT,
  city TEXT,
  state TEXT,
  division TEXT,
  gender TEXT,
  logo_url TEXT,
  total_athletes INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS team_id,
    t.school_name,
    t.city,
    t.state,
    t.division,
    t.gender,
    t.logo_url,
    COALESCE(roster_count.count, 0)::INT AS total_athletes
  FROM teams t
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM team_memberships
    WHERE team_memberships.team_id = t.id
      AND team_memberships.status = 'active'
  ) roster_count ON true
  WHERE t.is_public = true
    AND (p_search IS NULL OR t.school_name ILIKE '%' || p_search || '%')
    AND (p_state IS NULL OR t.state = p_state)
    AND (p_gender IS NULL OR t.gender = p_gender)
  ORDER BY t.school_name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
