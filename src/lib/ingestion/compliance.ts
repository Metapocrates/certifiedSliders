/**
 * Third-Party Ranking Ingestion — Compliance Guardrails
 *
 * COMPLIANCE: This module enforces all non-negotiable rules:
 * - Only factual data fields are allowed
 * - Editorial content is detected and rejected
 * - Full provenance is required on every record
 * - Rate limiting and crawl delays are enforced
 * - Sources can be killed instantly
 */

import { createHash } from "crypto";
import type {
  AllowedField,
  IngestionSource,
  ParsedAthleteRecord,
  StagingRecord,
} from "./types";
import { ALLOWED_FIELDS } from "./types";

// ─── Field Allowlist Enforcement ───────────────────────────────────
// COMPLIANCE: Only these fields may be extracted from any source.

/**
 * Strip any keys from a parsed record that aren't in the allowlist.
 * This is a safety net — adapters should only return allowed fields,
 * but this enforces it at the pipeline level too.
 */
export function enforceFieldAllowlist(
  record: Record<string, unknown>
): ParsedAthleteRecord {
  const allowed = new Set<string>(ALLOWED_FIELDS);
  const clean: Record<string, unknown> = {};

  for (const key of Object.keys(record)) {
    // Map 'rank' to 'raw_rank' for DB column naming
    const fieldKey = key === "rank" ? "raw_rank" : key;
    const lookupKey = key === "raw_rank" ? "rank" : key;

    if (allowed.has(lookupKey as AllowedField) || allowed.has(key as AllowedField)) {
      clean[fieldKey] = record[key];
    }
    // COMPLIANCE: Any field not in ALLOWED_FIELDS is silently dropped
  }

  return {
    athlete_name: String(clean.athlete_name ?? ""),
    grad_class: clean.grad_class != null ? Number(clean.grad_class) : null,
    raw_rank: clean.raw_rank != null ? Number(clean.raw_rank) : null,
    event: clean.event != null ? String(clean.event) : null,
    school: clean.school != null ? String(clean.school) : null,
    state: clean.state != null ? String(clean.state) : null,
    source_rating: clean.source_rating != null ? Number(clean.source_rating) : null,
  };
}

// ─── Editorial Content Detection ───────────────────────────────────
// COMPLIANCE: If unclear whether data is factual vs editorial → DO NOT ingest.

const EDITORIAL_PATTERNS = [
  // Sentence-like content (3+ words with common sentence patterns)
  /\b(?:is|was|has|had|will|can|should|would|could)\b.*\b(?:the|a|an|that|this|which)\b/i,
  // Descriptive phrases
  /\b(?:outstanding|exceptional|impressive|tremendous|remarkable|elite|top-tier|standout)\b/i,
  // Recruiting analysis language
  /\b(?:projects to|ceiling of|upside|potential|stock rising|sleeper|underrated|overrated)\b/i,
  // Bio/profile language
  /\b(?:committed to|verbal commit|decommit|official visit|unofficial visit)\b/i,
  // Long text blocks (>100 chars likely editorial)
  /.{100,}/,
];

/**
 * Check if a string contains editorial content that should NOT be ingested.
 * Returns true if the text appears editorial (not factual).
 */
export function isEditorialContent(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  for (const pattern of EDITORIAL_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

/**
 * Validate that a parsed record contains only factual data.
 * Returns an array of compliance issues (empty = compliant).
 */
export function validateRecord(
  record: ParsedAthleteRecord
): string[] {
  const issues: string[] = [];

  // Name is required
  if (!record.athlete_name || record.athlete_name.trim().length === 0) {
    issues.push("athlete_name is required");
  }

  // Check each text field for editorial content
  const textFields: (keyof ParsedAthleteRecord)[] = [
    "athlete_name",
    "event",
    "school",
    "state",
  ];

  for (const field of textFields) {
    const value = record[field];
    if (typeof value === "string" && isEditorialContent(value)) {
      // COMPLIANCE: If unclear whether factual vs editorial → reject
      issues.push(
        `${field} appears to contain editorial content: "${value.slice(0, 50)}..."`
      );
    }
  }

  // Rank must be a positive integer if present
  if (record.raw_rank != null && (record.raw_rank < 1 || !Number.isInteger(record.raw_rank))) {
    issues.push(`raw_rank must be a positive integer, got: ${record.raw_rank}`);
  }

  // Grad class must be a reasonable year if present
  if (record.grad_class != null) {
    const currentYear = new Date().getFullYear();
    if (record.grad_class < currentYear - 1 || record.grad_class > currentYear + 6) {
      issues.push(`grad_class ${record.grad_class} is outside reasonable range`);
    }
  }

  return issues;
}

// ─── Provenance ────────────────────────────────────────────────────
// COMPLIANCE: Every imported field must include provenance (source + URL + timestamp)

/**
 * Generate a dedup hash for a staging record.
 * Hash is based on source + name + class + event to prevent duplicate ingestion.
 */
export function generateRecordHash(
  sourceId: string,
  record: ParsedAthleteRecord
): string {
  const parts = [
    sourceId,
    (record.athlete_name ?? "").toLowerCase().trim(),
    String(record.grad_class ?? ""),
    (record.event ?? "").toLowerCase().trim(),
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

/**
 * Build a complete staging record with provenance metadata.
 */
export function buildStagingRecord(
  source: IngestionSource,
  record: ParsedAthleteRecord,
  sourceUrl: string
): StagingRecord {
  return {
    ...record,
    source_id: source.id,
    source_url: sourceUrl,
    source_name: source.name,
    source_fetched_at: new Date().toISOString(),
    record_hash: generateRecordHash(source.id, record),
    confidence: calculateConfidence(record),
  };
}

/**
 * Calculate a confidence score for a parsed record (0-1).
 * Higher confidence = more complete data.
 */
function calculateConfidence(record: ParsedAthleteRecord): number {
  let score = 0;
  let maxScore = 0;

  // Name is worth 30%
  maxScore += 30;
  if (record.athlete_name && record.athlete_name.trim().length > 0) score += 30;

  // Grad class is worth 20%
  maxScore += 20;
  if (record.grad_class != null) score += 20;

  // School is worth 20%
  maxScore += 20;
  if (record.school && record.school.trim().length > 0) score += 20;

  // Event is worth 15%
  maxScore += 15;
  if (record.event && record.event.trim().length > 0) score += 15;

  // State is worth 10%
  maxScore += 10;
  if (record.state && record.state.trim().length > 0) score += 10;

  // Rank is worth 5% (it's just a reference)
  maxScore += 5;
  if (record.raw_rank != null) score += 5;

  return Math.round((score / maxScore) * 100) / 100;
}

// ─── Source Kill Switch ────────────────────────────────────────────

/**
 * Check if a source is enabled for ingestion.
 * COMPLIANCE: Disabled sources must be completely blocked.
 */
export function assertSourceEnabled(source: IngestionSource): void {
  if (!source.is_enabled) {
    throw new Error(
      `INGESTION BLOCKED: Source "${source.name}" (${source.key}) is disabled. ` +
        `Enable it in the admin panel before running ingestion.`
    );
  }
}

/**
 * Check robots.txt compliance for a source.
 */
export function assertRobotsTxtCompliance(source: IngestionSource): void {
  if (source.robots_txt_allows === false) {
    throw new Error(
      `COMPLIANCE: robots.txt for "${source.name}" disallows our bot. ` +
        `Ingestion is blocked until this is resolved.`
    );
  }
}

// ─── Rate Limiting ─────────────────────────────────────────────────

const lastFetchTimestamps = new Map<string, number>();

/**
 * Enforce crawl delay between requests to a source.
 * Returns a promise that resolves after the required delay.
 */
export async function enforceCrawlDelay(source: IngestionSource): Promise<void> {
  const lastFetch = lastFetchTimestamps.get(source.key) ?? 0;
  const elapsed = Date.now() - lastFetch;
  const delay = source.crawl_delay_ms;

  if (elapsed < delay) {
    await new Promise((resolve) => setTimeout(resolve, delay - elapsed));
  }

  lastFetchTimestamps.set(source.key, Date.now());
}
