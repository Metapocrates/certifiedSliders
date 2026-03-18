/**
 * Ranking Engine — Score Computation
 *
 * Computes composite ranking scores from verified performance data.
 * This is OUR independent ranking — not derived from third-party rankings.
 *
 * COMPLIANCE: Third-party rankings are capped at 5% weight maximum.
 * The primary signal (50%) is always the athlete's verified performance marks.
 */

import {
  DEFAULT_WEIGHTS,
  type RankingInput,
  type RankingScore,
  type RankingWeights,
} from "./types";

/**
 * Compute a ranking score for an athlete's event performance.
 *
 * @param input - All signals for the athlete in this event
 * @param weights - Optional custom weights (defaults enforce compliance caps)
 * @returns Composite score with component breakdown
 */
export function computeRankingScore(
  input: RankingInput,
  weights: RankingWeights = DEFAULT_WEIGHTS
): RankingScore {
  // COMPLIANCE: Enforce maximum weight for external signals
  const safeWeights = { ...weights };
  if (safeWeights.external_reference > 0.05) {
    safeWeights.external_reference = 0.05;
  }

  // Normalize weights to sum to 1.0
  const totalWeight = Object.values(safeWeights).reduce((a, b) => a + b, 0);
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    const scale = 1.0 / totalWeight;
    for (const key of Object.keys(safeWeights) as (keyof RankingWeights)[]) {
      safeWeights[key] *= scale;
    }
  }

  const components = {
    performance: computePerformanceScore(input),
    recency: computeRecencyScore(input),
    consistency: computeConsistencyScore(input),
    improvement: computeImprovementScore(input),
    volume: computeVolumeScore(input),
    mark_quality: computeMarkQualityScore(input),
    external_reference: computeExternalReferenceScore(input),
  };

  const composite_score =
    components.performance * safeWeights.performance +
    components.recency * safeWeights.recency +
    components.consistency * safeWeights.consistency +
    components.improvement * safeWeights.improvement +
    components.volume * safeWeights.volume +
    components.mark_quality * safeWeights.mark_quality +
    components.external_reference * safeWeights.external_reference;

  return {
    athlete_id: input.athlete_id,
    event: input.event,
    composite_score: Math.round(composite_score * 100) / 100,
    components,
    computed_rank: null, // Set later when comparing within cohort
  };
}

// ─── Component Scorers (each returns 0-100) ────────────────────

/**
 * Performance score: How good is the best mark?
 * Uses the existing star rating standards as benchmarks.
 * Score 0-100 based on where the mark falls in the performance spectrum.
 */
function computePerformanceScore(input: RankingInput): number {
  // Placeholder: In production, this would compare against
  // rating_standards_grade to determine where the mark falls
  // relative to 3/4/5 star cutoffs for the event+grade+gender.
  //
  // For now, use star rating as a proxy if available.
  if (input.secondary.star_rating) {
    // 3 stars = 60, 4 stars = 80, 5 stars = 95
    return Math.min(100, input.secondary.star_rating * 20 - 5);
  }

  // Without star rating, score based on result count as a proxy
  // (athletes with more results are likely more competitive)
  return Math.min(50, input.primary.result_count * 10);
}

/**
 * Recency score: How recent is the best performance?
 * Recent performances are weighted higher.
 */
function computeRecencyScore(input: RankingInput): number {
  if (!input.primary.most_recent_date) return 0;

  const daysSince = Math.floor(
    (Date.now() - new Date(input.primary.most_recent_date).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Within 30 days: 100, 60 days: 85, 90 days: 70, 180 days: 40, 365+: 10
  if (daysSince <= 30) return 100;
  if (daysSince <= 60) return 85;
  if (daysSince <= 90) return 70;
  if (daysSince <= 180) return 40;
  if (daysSince <= 365) return 20;
  return 10;
}

/**
 * Consistency score: How consistent are the athlete's marks?
 * Low standard deviation relative to mean = more consistent.
 */
function computeConsistencyScore(input: RankingInput): number {
  if (input.primary.result_count < 2) return 50; // Not enough data
  if (input.primary.average_mark === 0) return 50;

  // Coefficient of variation (lower = more consistent)
  const cv = input.primary.mark_stddev / Math.abs(input.primary.average_mark);

  // CV < 0.02: excellent consistency (score 95)
  // CV < 0.05: good (80)
  // CV < 0.10: average (60)
  // CV > 0.15: inconsistent (30)
  if (cv < 0.02) return 95;
  if (cv < 0.05) return 80;
  if (cv < 0.10) return 60;
  if (cv < 0.15) return 40;
  return 30;
}

/**
 * Improvement trend: Is the athlete getting better over time?
 * Placeholder — requires time-series analysis of results.
 */
function computeImprovementScore(_input: RankingInput): number {
  // TODO: Implement trend analysis comparing recent vs older marks
  // For now, return neutral score
  return 50;
}

/**
 * Volume score: How many competitions has the athlete entered?
 * More competitions = more reliable data.
 */
function computeVolumeScore(input: RankingInput): number {
  const count = input.primary.result_count;
  // 1 result: 20, 3: 50, 5: 70, 8+: 90, 15+: 100
  if (count >= 15) return 100;
  if (count >= 8) return 90;
  if (count >= 5) return 70;
  if (count >= 3) return 50;
  if (count >= 1) return 20;
  return 0;
}

/**
 * Mark quality: FAT timing, wind-legal, etc.
 */
function computeMarkQualityScore(input: RankingInput): number {
  let score = 50; // baseline
  if (input.primary.has_fat) score += 25;
  if (input.primary.is_wind_legal) score += 25;
  return Math.min(100, score);
}

/**
 * External reference score: Optional signal from third-party rankings.
 *
 * COMPLIANCE: This is capped at 5% of total weight. Third-party rank
 * is NEVER the primary factor. It's a weak confirming signal only.
 */
function computeExternalReferenceScore(input: RankingInput): number {
  const ranks = input.secondary.external_ranks;
  if (!ranks || ranks.length === 0) return 0;

  // Average across sources (if multiple), then score
  // Top 10 rank = 90, Top 25 = 75, Top 50 = 60, Top 100 = 40, Top 250 = 20
  const avgRank =
    ranks.reduce((sum, r) => sum + r.rank, 0) / ranks.length;

  if (avgRank <= 10) return 90;
  if (avgRank <= 25) return 75;
  if (avgRank <= 50) return 60;
  if (avgRank <= 100) return 40;
  if (avgRank <= 250) return 20;
  return 10;
}
