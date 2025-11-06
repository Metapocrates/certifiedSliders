/**
 * Grade/Academic Year Calculation Utilities
 *
 * School years run August 1 - July 31
 * Grades: 9 (Freshman), 10 (Sophomore), 11 (Junior), 12 (Senior)
 */

/**
 * Get the school year for a given date.
 * School year advances on August 1st.
 *
 * @example
 * getSchoolYear(new Date('2026-07-31')) // 2026 (still 2025-26 school year)
 * getSchoolYear(new Date('2026-08-01')) // 2027 (now 2026-27 school year)
 */
export function getSchoolYear(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11 (0=January)

  // If August (7) or later, we're in the next school year
  // Otherwise, we're still in the previous school year
  return month >= 7 ? year + 1 : year;
}

/**
 * Calculate the academic grade (9-12) for an athlete at a specific date.
 * Returns null if the athlete is not in high school grades 9-12 at that time.
 *
 * @param classYear - The athlete's graduation year (e.g., 2028)
 * @param meetDate - The date of the performance
 * @returns Grade (9, 10, 11, or 12) or null if out of range
 *
 * @example
 * // Class of 2028 athlete on July 31, 2026
 * getGradeAtDate(2028, new Date('2026-07-31')) // 10 (Sophomore)
 *
 * // Class of 2028 athlete on August 1, 2026
 * getGradeAtDate(2028, new Date('2026-08-01')) // 11 (Junior)
 */
export function getGradeAtDate(classYear: number, meetDate: Date): number | null {
  if (!classYear) return null;

  const schoolYear = getSchoolYear(meetDate);
  const yearsUntilGrad = classYear - schoolYear;

  // Map years until graduation to grade level
  switch (yearsUntilGrad) {
    case 3: return 9;  // Freshman (3 years until grad)
    case 2: return 10; // Sophomore (2 years until grad)
    case 1: return 11; // Junior (1 year until grad)
    case 0: return 12; // Senior (graduating this school year)
    default: return null; // Pre-HS or graduated
  }
}

/**
 * Get the current academic grade for an athlete.
 * Uses today's date for calculation.
 */
export function getCurrentGrade(classYear: number): number | null {
  return getGradeAtDate(classYear, new Date());
}

/**
 * Format a grade number as a readable string.
 *
 * @example
 * formatGrade(9)  // "Freshman"
 * formatGrade(10) // "Sophomore"
 * formatGrade(11) // "Junior"
 * formatGrade(12) // "Senior"
 * formatGrade(null) // "—"
 */
export function formatGrade(grade: number | null): string {
  switch (grade) {
    case 9: return "Freshman";
    case 10: return "Sophomore";
    case 11: return "Junior";
    case 12: return "Senior";
    default: return "—";
  }
}

/**
 * Format a grade number as a short abbreviation.
 *
 * @example
 * formatGradeShort(9)  // "FR"
 * formatGradeShort(10) // "SO"
 * formatGradeShort(11) // "JR"
 * formatGradeShort(12) // "SR"
 */
export function formatGradeShort(grade: number | null): string {
  switch (grade) {
    case 9: return "FR";
    case 10: return "SO";
    case 11: return "JR";
    case 12: return "SR";
    default: return "—";
  }
}

/**
 * Validate that a grade is a valid high school grade (9-12).
 */
export function isValidGrade(grade: number | null): grade is 9 | 10 | 11 | 12 {
  return grade === 9 || grade === 10 || grade === 11 || grade === 12;
}
