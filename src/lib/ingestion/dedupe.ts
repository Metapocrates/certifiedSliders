/**
 * Third-Party Ranking Ingestion — Deduplication & Matching
 *
 * Matches staging records to existing profiles using heuristics.
 * COMPLIANCE: Never overwrites higher-confidence existing data.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DedupeMatch, ParsedAthleteRecord } from "./types";

/**
 * Attempt to match a parsed record to an existing profile.
 * Returns the best match if confidence is above threshold, or null.
 *
 * Matching strategies (in priority order):
 * 1. Exact: name + school + grad class (confidence: 0.95)
 * 2. Strong: name + grad class (confidence: 0.75)
 * 3. Fuzzy: normalized name + school (confidence: 0.60)
 * 4. Weak: normalized name only (confidence: 0.40) — flagged for manual review
 */
export async function findMatchingProfile(
  supabase: SupabaseClient,
  record: ParsedAthleteRecord
): Promise<DedupeMatch | null> {
  const name = record.athlete_name.trim();
  if (!name) return null;

  // Strategy 1: Exact match on name + school + class
  if (record.school && record.grad_class) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .ilike("full_name", name)
      .ilike("school_name", `%${record.school}%`)
      .eq("class_year", record.grad_class)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (data) {
      return {
        profile_id: data.id,
        confidence: 0.95,
        method: "exact_name_school_class",
      };
    }
  }

  // Strategy 2: Name + grad class (no school)
  if (record.grad_class) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .ilike("full_name", name)
      .eq("class_year", record.grad_class)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (data) {
      return {
        profile_id: data.id,
        confidence: 0.75,
        method: "name_class",
      };
    }
  }

  // Strategy 3: Fuzzy name + school (handles slight name variations)
  if (record.school) {
    const normalizedName = normalizeName(name);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .ilike("school_name", `%${record.school}%`)
      .eq("status", "active")
      .limit(50);

    if (data) {
      for (const profile of data) {
        if (
          profile.full_name &&
          normalizeName(profile.full_name) === normalizedName
        ) {
          return {
            profile_id: profile.id,
            confidence: 0.6,
            method: "fuzzy_name_school",
          };
        }
      }
    }
  }

  // Strategy 4: Name-only match (low confidence, requires review)
  // Also check athlete_aliases table
  const { data: aliasMatch } = await supabase
    .from("athlete_aliases")
    .select("athlete_id")
    .ilike("alias", name)
    .limit(1)
    .maybeSingle();

  if (aliasMatch) {
    return {
      profile_id: aliasMatch.athlete_id,
      confidence: 0.5,
      method: "alias_match",
    };
  }

  // No match found — will need manual review or create new
  return null;
}

/**
 * Normalize a name for fuzzy comparison.
 * Strips accents, lowercases, removes common prefixes/suffixes.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z\s]/g, "") // remove non-alpha
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}
