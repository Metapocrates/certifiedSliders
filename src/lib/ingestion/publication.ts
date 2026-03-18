/**
 * Third-Party Ranking Ingestion — Publication Rules
 *
 * COMPLIANCE (enforced in code):
 * - Athlete page shows OUR star rating as primary
 * - Third-party rank displayed as: "SCA Recruiting Rank: #X (as of Mar 2026)"
 * - Must include source attribution (name + link)
 * - Must NOT display copied descriptions or full ranking lists
 * - No endpoint can return a full ranked list from a single third-party source
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ExternalRankReference {
  source_name: string;
  source_url: string;
  rank: number;
  fetched_at: string;
  /** Formatted display string with attribution */
  display: string;
}

/**
 * Get approved external rank references for an athlete profile.
 * Returns only approved/merged records with full provenance.
 *
 * COMPLIANCE: This returns individual references per source,
 * NOT a full ranking list. Each reference includes attribution.
 */
export async function getExternalRanks(
  supabase: SupabaseClient,
  profileId: string
): Promise<ExternalRankReference[]> {
  const { data, error } = await supabase
    .from("ingestion_staging")
    .select(
      "raw_rank, source_name, source_url, source_fetched_at"
    )
    .eq("matched_profile_id", profileId)
    .in("status", ["approved", "merged"])
    .not("raw_rank", "is", null)
    .order("source_fetched_at", { ascending: false });

  if (error || !data) return [];

  // COMPLIANCE: Deduplicate per source — only show most recent rank per source
  const seenSources = new Set<string>();
  const results: ExternalRankReference[] = [];

  for (const row of data) {
    if (seenSources.has(row.source_name)) continue;
    seenSources.add(row.source_name);

    const date = new Date(row.source_fetched_at);
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    results.push({
      source_name: row.source_name,
      source_url: row.source_url,
      rank: row.raw_rank,
      fetched_at: row.source_fetched_at,
      // COMPLIANCE: Attribution format with source name + date
      display: `${row.source_name} Rank: #${row.raw_rank} (as of ${dateStr})`,
    });
  }

  return results;
}

/**
 * COMPLIANCE GUARD: Prevent exposing full ranking lists from a third-party source.
 * This function should be called by any public API that returns ranking data.
 *
 * Returns true if the query would effectively recreate a source's ranking product.
 */
export function wouldExposeFullRankingList(
  query: {
    source_id?: string;
    limit?: number;
    hasOtherFilters?: boolean;
  }
): boolean {
  // If querying by a single source with high limit and no other filters,
  // this would effectively recreate their ranking page
  if (query.source_id && !query.hasOtherFilters) {
    const limit = query.limit ?? 100;
    if (limit > 25) return true; // More than 25 records from one source = too much
  }
  return false;
}
