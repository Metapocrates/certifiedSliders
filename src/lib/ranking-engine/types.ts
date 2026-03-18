/**
 * Ranking Engine — Core Types
 *
 * Our INDEPENDENT ranking system. Third-party rankings are NOT primary input.
 * This engine uses verified performance marks as the primary signal.
 *
 * COMPLIANCE: Third-party rankings are an optional secondary signal only.
 * They are NEVER the primary factor in computing our ranking.
 */

// ─── Ranking Input Signals ──────────────────────────────────────

export interface RankingInput {
  athlete_id: string;
  event: string;
  gender: string;
  class_year: number;
  grade: number;

  /** PRIMARY signals (from our verified results) */
  primary: {
    /** Best verified mark (seconds for track, meters for field) */
    best_mark: number;
    /** Is this a time event? (lower is better) */
    is_time_event: boolean;
    /** Number of verified results for this event */
    result_count: number;
    /** Most recent result date */
    most_recent_date: string;
    /** Average mark across all verified results */
    average_mark: number;
    /** Standard deviation of marks (consistency) */
    mark_stddev: number;
    /** Whether best mark has FAT timing */
    has_fat: boolean;
    /** Whether best mark is wind-legal */
    is_wind_legal: boolean;
  };

  /** SECONDARY signals (optional, weighted low) */
  secondary: {
    /** Our star rating (3-5) if assigned */
    star_rating: number | null;
    /**
     * Third-party rank references (e.g. SCA #15).
     * COMPLIANCE: These are reference only, NOT primary input.
     * Maximum weight: 5% of total score.
     */
    external_ranks: Array<{
      source: string;
      rank: number;
    }>;
  };
}

// ─── Ranking Output ────────────────────────────────────────────

export interface RankingScore {
  athlete_id: string;
  event: string;
  /** Overall composite score (0-100) */
  composite_score: number;
  /** Breakdown of score components */
  components: {
    /** Performance quality (best mark vs standards) — weight: 50% */
    performance: number;
    /** Recency (how recent the best mark is) — weight: 15% */
    recency: number;
    /** Consistency (low stddev = more consistent) — weight: 10% */
    consistency: number;
    /** Improvement trend (getting better over time) — weight: 10% */
    improvement: number;
    /** Volume (number of competitions) — weight: 5% */
    volume: number;
    /** Mark quality (FAT, wind-legal, etc.) — weight: 5% */
    mark_quality: number;
    /** External references (third-party ranks) — weight: 5% MAX */
    external_reference: number;
  };
  /** Computed rank within the event/class/gender cohort */
  computed_rank: number | null;
}

// ─── Weight Configuration ──────────────────────────────────────

export interface RankingWeights {
  performance: number;
  recency: number;
  consistency: number;
  improvement: number;
  volume: number;
  mark_quality: number;
  /** COMPLIANCE: This must NEVER exceed 0.05 (5%) */
  external_reference: number;
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  performance: 0.50,
  recency: 0.15,
  consistency: 0.10,
  improvement: 0.10,
  volume: 0.05,
  mark_quality: 0.05,
  // COMPLIANCE: External signals capped at 5% — third-party rank is NEVER primary
  external_reference: 0.05,
};
