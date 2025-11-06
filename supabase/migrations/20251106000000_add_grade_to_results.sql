-- Add grade (academic year) tracking to results table
-- Grades: 9 (Freshman), 10 (Sophomore), 11 (Junior), 12 (Senior)
-- School year runs August 1 - July 31

-- Add grade column to results table
ALTER TABLE results
  ADD COLUMN grade int CHECK (grade IN (9, 10, 11, 12));

COMMENT ON COLUMN results.grade IS
  'Academic grade (9-12) at time of meet, based on class_year and meet_date. School year advances August 1.';

-- Add index for filtering by grade
CREATE INDEX idx_results_grade ON results(grade);

-- Add index for common queries (grade + status)
CREATE INDEX idx_results_grade_status ON results(grade, status);

-- Function to calculate grade from class_year and meet_date
-- School year advances August 1st
CREATE OR REPLACE FUNCTION calculate_grade_from_date(
  class_year_param int,
  meet_date_param date
)
RETURNS int AS $$
DECLARE
  school_year int;
  years_until_grad int;
BEGIN
  -- Return null if no class year
  IF class_year_param IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate school year (advances Aug 1)
  -- If month >= 8 (August), school year = year + 1
  -- Otherwise, school year = year
  IF EXTRACT(MONTH FROM meet_date_param) >= 8 THEN
    school_year := EXTRACT(YEAR FROM meet_date_param) + 1;
  ELSE
    school_year := EXTRACT(YEAR FROM meet_date_param);
  END IF;

  -- Calculate years until graduation
  years_until_grad := class_year_param - school_year;

  -- Map to grade level (9-12 only)
  CASE years_until_grad
    WHEN 4 THEN RETURN 9;  -- Freshman
    WHEN 3 THEN RETURN 10; -- Sophomore
    WHEN 2 THEN RETURN 11; -- Junior
    WHEN 1 THEN RETURN 12; -- Senior
    ELSE RETURN NULL;      -- Pre-HS or graduated
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_grade_from_date IS
  'Calculate academic grade (9-12) from class year and meet date. School year advances August 1.';

-- Backfill grades for existing results
-- Join with profiles to get class_year, then calculate grade
UPDATE results r
SET grade = calculate_grade_from_date(p.class_year, r.meet_date)
FROM profiles p
WHERE r.athlete_id = p.id
  AND r.meet_date IS NOT NULL
  AND p.class_year IS NOT NULL
  AND r.grade IS NULL;
