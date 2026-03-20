/**
 * Third-Party Ranking Ingestion — Core Types
 *
 * COMPLIANCE: This system ingests only factual data (name, class, rank, event,
 * school, state) with full provenance. No editorial content is ever stored.
 */

// ─── Factual Fields Only ───────────────────────────────────────────
// COMPLIANCE: These are the ONLY fields allowed from any third-party source.
// If a field is not in this list, it must NOT be extracted or stored.

export const ALLOWED_FIELDS = [
  "athlete_name",
  "grad_class",
  "rank",
  "event",
  "school",
  "state",
  "source_rating",
] as const;

export type AllowedField = (typeof ALLOWED_FIELDS)[number];

// ─── Source Configuration ──────────────────────────────────────────

export interface IngestionSource {
  id: string;
  key: string;
  name: string;
  base_url: string;
  is_enabled: boolean;
  crawl_delay_ms: number;
  robots_txt_checked_at: string | null;
  robots_txt_allows: boolean | null;
  field_allowlist: AllowedField[];
  max_records_per_run: number;
  notes: string | null;
}

// ─── Parsed Record (output of source adapter) ─────────────────────

export interface ParsedAthleteRecord {
  /** Full name as it appears on the source page */
  athlete_name: string;
  /** Graduation year (e.g. 2026). Null if not present. */
  grad_class: number | null;
  /** Rank number from this source. Reference only — NOT our ranking. */
  raw_rank: number | null;
  /** Primary event if listed (e.g. "100m", "Shot Put") */
  event: string | null;
  /** School name if listed */
  school: string | null;
  /** State code if listed (e.g. "CA", "TX") */
  state: string | null;
  /** Source's star rating (3-5) if present. Reference only — NOT our rating. */
  source_rating: number | null;
}

// ─── Staging Record (what gets written to DB) ─────────────────────

export interface StagingRecord extends ParsedAthleteRecord {
  source_id: string;
  source_url: string;
  source_name: string;
  source_fetched_at: string;
  record_hash: string;
  confidence: number;
}

// ─── Ingestion Run ────────────────────────────────────────────────

export type RunStatus = "running" | "completed" | "failed" | "aborted";

export interface IngestionRun {
  id: string;
  source_id: string;
  source_url: string;
  status: RunStatus;
  records_found: number;
  records_staged: number;
  records_skipped: number;
  error_message: string | null;
  triggered_by: string | null;
  started_at: string;
  completed_at: string | null;
}

// ─── Staging Review ───────────────────────────────────────────────

export type StagingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "merged"
  | "duplicate";

export interface StagingReview {
  id: string;
  status: StagingStatus;
  matched_profile_id: string | null;
  reviewed_by: string;
  review_notes: string | null;
}

// ─── Source Adapter Interface ─────────────────────────────────────
// Each source (SCA, PrepStar, etc.) implements this interface.

export interface SourceAdapter {
  /** Unique key matching ingestion_sources.key */
  readonly sourceKey: string;

  /**
   * Parse a ranking page URL and return ONLY factual athlete records.
   * COMPLIANCE: Must never return editorial text, descriptions, or page structure.
   *
   * @param html - Raw HTML of the page
   * @param url - The URL that was fetched (for provenance)
   * @returns Array of parsed athlete records with only allowed fields
   */
  parse(html: string, url: string): ParsedAthleteRecord[];

  /**
   * Validate that a URL belongs to this source.
   * Used to route URLs to the correct adapter.
   */
  matchesUrl(url: string): boolean;
}

// ─── Dedupe Match Result ──────────────────────────────────────────

export interface DedupeMatch {
  profile_id: string;
  confidence: number;
  method: string; // e.g. 'exact_name_school_class', 'fuzzy_name_school'
}
