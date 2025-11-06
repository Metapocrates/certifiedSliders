-- Admin Rating Decision Flow
-- Implements backend for admin star rating approval with automatic thresholds as signals

-- 1. Fix calculate_grade_from_date to match corrected logic (3,2,1,0 not 4,3,2,1)
CREATE OR REPLACE FUNCTION calculate_grade_from_date(
  class_year_param int,
  meet_date_param date
)
RETURNS int AS $$
DECLARE
  school_year int;
  years_until_grad int;
BEGIN
  IF class_year_param IS NULL OR meet_date_param IS NULL THEN
    RETURN NULL;
  END IF;

  -- School year advances Aug 1
  IF EXTRACT(MONTH FROM meet_date_param) >= 8 THEN
    school_year := EXTRACT(YEAR FROM meet_date_param) + 1;
  ELSE
    school_year := EXTRACT(YEAR FROM meet_date_param);
  END IF;

  years_until_grad := class_year_param - school_year;

  -- Corrected mapping: 3=FR, 2=SO, 1=JR, 0=SR
  CASE years_until_grad
    WHEN 3 THEN RETURN 9;  -- Freshman (3 years until grad)
    WHEN 2 THEN RETURN 10; -- Sophomore (2 years until grad)
    WHEN 1 THEN RETURN 11; -- Junior (1 year until grad)
    WHEN 0 THEN RETURN 12; -- Senior (graduating this school year)
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Re-calculate grades for all existing results with the corrected function
UPDATE results r
SET grade = calculate_grade_from_date(p.class_year, r.meet_date)
FROM profiles p
WHERE r.athlete_id = p.id
  AND r.meet_date IS NOT NULL
  AND p.class_year IS NOT NULL;

-- 2. Ensure rating_standards_grade cutoffs use proper numeric precision
-- (Already using numeric type, but let's ensure it's numeric(8,3) for consistency)
ALTER TABLE rating_standards_grade
  ALTER COLUMN star3 TYPE numeric(8,3),
  ALTER COLUMN star4 TYPE numeric(8,3),
  ALTER COLUMN star5 TYPE numeric(8,3);

-- 3. Create function to calculate auto star rating for a given mark
CREATE OR REPLACE FUNCTION calculate_auto_stars(
  p_event text,
  p_gender text,
  p_grade int,
  p_mark numeric,
  p_is_time boolean
)
RETURNS int AS $$
DECLARE
  v_star3 numeric;
  v_star4 numeric;
  v_star5 numeric;
BEGIN
  -- Get cutoffs for this event/gender/grade
  SELECT star3, star4, star5
  INTO v_star3, v_star4, v_star5
  FROM rating_standards_grade
  WHERE event = p_event
    AND gender = p_gender
    AND grade = p_grade
    AND is_time = p_is_time;

  -- If no standards found, return 0
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- For time events, lower is better (<=)
  IF p_is_time THEN
    IF v_star5 IS NOT NULL AND p_mark <= v_star5 THEN RETURN 5; END IF;
    IF v_star4 IS NOT NULL AND p_mark <= v_star4 THEN RETURN 4; END IF;
    IF v_star3 IS NOT NULL AND p_mark <= v_star3 THEN RETURN 3; END IF;
  -- For distance/field events, higher is better (>=)
  ELSE
    IF v_star5 IS NOT NULL AND p_mark >= v_star5 THEN RETURN 5; END IF;
    IF v_star4 IS NOT NULL AND p_mark >= v_star4 THEN RETURN 4; END IF;
    IF v_star3 IS NOT NULL AND p_mark >= v_star3 THEN RETURN 3; END IF;
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION calculate_auto_stars TO authenticated;

-- 4. Create v_rating_inputs view
-- Combines best marks with auto stars and quality flags
CREATE OR REPLACE VIEW v_rating_inputs AS
WITH best_marks AS (
  SELECT DISTINCT ON (r.athlete_id, r.event)
    r.id::bigint as result_id,
    r.athlete_id,
    r.event,
    r.mark,
    r.mark_seconds_adj,
    r.mark_metric,
    r.meet_date,
    r.meet_name,
    r.season,
    r.grade,
    r.proof_url,
    r.wind,
    r.timing,
    r.status,
    r.created_at,
    p.gender,
    p.class_year,
    p.full_name,
    p.username
  FROM results r
  JOIN profiles p ON p.id = r.athlete_id
  WHERE r.status IN ('verified', 'approved', 'imported')
    AND r.meet_date IS NOT NULL
    AND p.class_year IS NOT NULL
  ORDER BY r.athlete_id, r.event,
    -- Order by best mark (time: lower is better, field: higher is better)
    CASE
      WHEN r.mark_seconds_adj IS NOT NULL THEN r.mark_seconds_adj
      ELSE -COALESCE(r.mark_metric, 0)
    END
)
SELECT
  bm.result_id,
  bm.athlete_id,
  bm.username,
  bm.full_name,
  bm.event,
  bm.mark,
  bm.mark_seconds_adj,
  bm.mark_metric,
  bm.meet_date,
  bm.meet_name,
  bm.season,
  bm.grade,
  bm.class_year,
  bm.gender,
  bm.proof_url,
  bm.wind,
  bm.timing,
  bm.status,
  -- Calculate auto stars
  calculate_auto_stars(
    bm.event,
    CASE
      WHEN bm.gender ILIKE 'm%' OR bm.gender ILIKE 'boy%' THEN 'M'
      WHEN bm.gender ILIKE 'f%' OR bm.gender ILIKE 'girl%' THEN 'F'
      ELSE 'U'
    END,
    bm.grade,
    COALESCE(bm.mark_seconds_adj, bm.mark_metric),
    bm.mark_seconds_adj IS NOT NULL
  ) as auto_stars,
  -- Quality flags
  bm.proof_url IS NOT NULL as has_proof,
  UPPER(bm.timing) = 'FAT' as is_fat,
  bm.wind IS NOT NULL AND bm.wind <= 2.0 as is_wind_legal,
  bm.meet_date >= (CURRENT_DATE - INTERVAL '180 days') as is_recent,
  false as is_quality_meet,  -- meet_category column doesn't exist yet
  bm.created_at
FROM best_marks bm;

COMMENT ON VIEW v_rating_inputs IS
  'Best marks per athlete/event with auto star calculations and quality flags for admin review';

GRANT SELECT ON v_rating_inputs TO authenticated;

-- 5. Create rating_decisions table
CREATE TABLE IF NOT EXISTS rating_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  result_id bigint NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  event text NOT NULL,
  season text,
  class_year int,
  grade int CHECK (grade IN (9, 10, 11, 12)),
  auto_stars int CHECK (auto_stars >= 0 AND auto_stars <= 5),
  decision text NOT NULL CHECK (decision IN ('approve', 'decline', 'needs_info')),
  final_stars int CHECK (final_stars IN (0, 3, 4, 5)),
  reason text,
  notes text,
  decided_by uuid NOT NULL REFERENCES auth.users(id),
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(result_id, decided_by)
);

CREATE INDEX idx_rating_decisions_athlete ON rating_decisions(athlete_id);
CREATE INDEX idx_rating_decisions_result ON rating_decisions(result_id);
CREATE INDEX idx_rating_decisions_decided_by ON rating_decisions(decided_by);
CREATE INDEX idx_rating_decisions_decision ON rating_decisions(decision);
CREATE INDEX idx_rating_decisions_decided_at ON rating_decisions(decided_at DESC);

COMMENT ON TABLE rating_decisions IS
  'Admin decisions on star ratings - uses auto_stars as signal, not final verdict';

-- RLS for rating_decisions
ALTER TABLE rating_decisions ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY rating_decisions_admin_all
  ON rating_decisions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- 6. Create RPC to get rating inputs for an athlete
CREATE OR REPLACE FUNCTION get_rating_inputs(p_athlete_id uuid)
RETURNS TABLE (
  result_id bigint,
  athlete_id uuid,
  username text,
  full_name text,
  event text,
  mark text,
  mark_seconds_adj numeric,
  mark_metric numeric,
  meet_date date,
  meet_name text,
  season text,
  grade int,
  class_year int,
  gender text,
  proof_url text,
  wind numeric,
  timing text,
  status text,
  auto_stars int,
  has_proof boolean,
  is_fat boolean,
  is_wind_legal boolean,
  is_recent boolean,
  is_quality_meet boolean,
  latest_decision jsonb,
  created_at timestamptz
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    vi.result_id,
    vi.athlete_id,
    vi.username,
    vi.full_name,
    vi.event,
    vi.mark,
    vi.mark_seconds_adj,
    vi.mark_metric,
    vi.meet_date,
    vi.meet_name,
    vi.season,
    vi.grade,
    vi.class_year,
    vi.gender,
    vi.proof_url,
    vi.wind,
    vi.timing,
    vi.status,
    vi.auto_stars,
    vi.has_proof,
    vi.is_fat,
    vi.is_wind_legal,
    vi.is_recent,
    vi.is_quality_meet,
    (
      SELECT jsonb_build_object(
        'decision', rd.decision,
        'final_stars', rd.final_stars,
        'reason', rd.reason,
        'notes', rd.notes,
        'decided_at', rd.decided_at,
        'decided_by', rd.decided_by
      )
      FROM rating_decisions rd
      WHERE rd.result_id = vi.result_id
      ORDER BY rd.decided_at DESC
      LIMIT 1
    ) as latest_decision,
    vi.created_at
  FROM v_rating_inputs vi
  WHERE vi.athlete_id = p_athlete_id
  ORDER BY vi.auto_stars DESC, vi.meet_date DESC;
$$;

GRANT EXECUTE ON FUNCTION get_rating_inputs TO authenticated;

-- 7. Create function to submit rating decision
CREATE OR REPLACE FUNCTION submit_rating_decision(
  p_result_id bigint,
  p_decision text,
  p_final_stars int,
  p_reason text,
  p_notes text DEFAULT NULL
)
RETURNS rating_decisions
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision rating_decisions;
  v_athlete_id uuid;
  v_event text;
  v_season text;
  v_class_year int;
  v_grade int;
  v_auto_stars int;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can submit rating decisions';
  END IF;

  -- Get result info and auto stars
  SELECT
    vi.athlete_id,
    vi.event,
    vi.season,
    vi.class_year,
    vi.grade,
    vi.auto_stars
  INTO
    v_athlete_id,
    v_event,
    v_season,
    v_class_year,
    v_grade,
    v_auto_stars
  FROM v_rating_inputs vi
  WHERE vi.result_id = p_result_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Result not found in rating inputs';
  END IF;

  -- Insert decision
  INSERT INTO rating_decisions (
    athlete_id,
    result_id,
    event,
    season,
    class_year,
    grade,
    auto_stars,
    decision,
    final_stars,
    reason,
    notes,
    decided_by
  ) VALUES (
    v_athlete_id,
    p_result_id,
    v_event,
    v_season,
    v_class_year,
    v_grade,
    v_auto_stars,
    p_decision,
    p_final_stars,
    p_reason,
    p_notes,
    auth.uid()
  )
  ON CONFLICT (result_id, decided_by)
  DO UPDATE SET
    decision = p_decision,
    final_stars = p_final_stars,
    reason = p_reason,
    notes = p_notes,
    decided_at = now(),
    updated_at = now()
  RETURNING * INTO v_decision;

  RETURN v_decision;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_rating_decision TO authenticated;

-- 8. Create view for pending rating reviews (no decision yet or needs_info)
CREATE OR REPLACE VIEW v_pending_rating_reviews AS
SELECT
  vi.*,
  (
    SELECT jsonb_build_object(
      'decision', rd.decision,
      'final_stars', rd.final_stars,
      'reason', rd.reason,
      'notes', rd.notes,
      'decided_at', rd.decided_at
    )
    FROM rating_decisions rd
    WHERE rd.result_id = vi.result_id
    ORDER BY rd.decided_at DESC
    LIMIT 1
  ) as latest_decision
FROM v_rating_inputs vi
WHERE vi.auto_stars >= 3  -- Only 3+ star candidates
  AND (
    NOT EXISTS (
      SELECT 1 FROM rating_decisions rd
      WHERE rd.result_id = vi.result_id
        AND rd.decision IN ('approve', 'decline')
    )
    OR EXISTS (
      SELECT 1 FROM rating_decisions rd
      WHERE rd.result_id = vi.result_id
        AND rd.decision = 'needs_info'
      ORDER BY rd.decided_at DESC
      LIMIT 1
    )
  )
ORDER BY vi.auto_stars DESC, vi.meet_date DESC;

GRANT SELECT ON v_pending_rating_reviews TO authenticated;

COMMENT ON VIEW v_pending_rating_reviews IS
  'Results awaiting admin rating decision (3+ auto stars, no approve/decline decision)';
