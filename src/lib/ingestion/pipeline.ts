/**
 * Third-Party Ranking Ingestion — Pipeline Orchestrator
 *
 * Flow: URL → fetch HTML → parse (adapter) → compliance check →
 *       dedupe match → write to staging → audit log
 *
 * COMPLIANCE:
 * - Never writes directly to production profile/results tables
 * - All data goes to ingestion_staging with status='pending'
 * - Admin approval required before anything is published
 * - Full provenance tracked on every record
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertRobotsTxtCompliance,
  assertSourceEnabled,
  buildStagingRecord,
  enforceCrawlDelay,
  enforceFieldAllowlist,
  validateRecord,
} from "./compliance";
import { findMatchingProfile } from "./dedupe";
import { getAdapter } from "./sources";
import type { IngestionRun, IngestionSource, StagingRecord } from "./types";

const USER_AGENT = "CertifiedSlidersBot/1.0 (+https://certifiedsliders.com)";

export interface PipelineResult {
  run: IngestionRun;
  staged: number;
  skipped: number;
  errors: string[];
}

/**
 * Run the ingestion pipeline for a given source and URL.
 *
 * @param supabase - Admin-level Supabase client
 * @param source - Source configuration from ingestion_sources table
 * @param url - Specific ranking page URL to ingest
 * @param triggeredBy - User ID of admin who triggered (null for cron)
 */
export async function runIngestionPipeline(
  supabase: SupabaseClient,
  source: IngestionSource,
  url: string,
  triggeredBy: string | null
): Promise<PipelineResult> {
  const errors: string[] = [];

  // ─── Pre-flight compliance checks ─────────────────────────────
  // COMPLIANCE: Block if source is disabled or robots.txt denies
  assertSourceEnabled(source);
  assertRobotsTxtCompliance(source);

  const adapter = getAdapter(source.key);
  if (!adapter) {
    throw new Error(`No adapter registered for source: ${source.key}`);
  }

  if (!adapter.matchesUrl(url)) {
    throw new Error(
      `URL "${url}" does not match source "${source.name}". Wrong adapter?`
    );
  }

  // ─── Create ingestion run record ──────────────────────────────
  const { data: run, error: runError } = await supabase
    .from("ingestion_runs")
    .insert({
      source_id: source.id,
      source_url: url,
      status: "running",
      triggered_by: triggeredBy,
    })
    .select()
    .single();

  if (runError || !run) {
    throw new Error(`Failed to create ingestion run: ${runError?.message}`);
  }

  try {
    // ─── Fetch HTML with rate limiting ────────────────────────────
    await enforceCrawlDelay(source);

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // ─── Parse with source adapter ────────────────────────────────
    // COMPLIANCE: Adapter returns only factual fields
    const rawRecords = adapter.parse(html, url);

    // Safety cap
    const cappedRecords = rawRecords.slice(0, source.max_records_per_run);
    if (rawRecords.length > source.max_records_per_run) {
      errors.push(
        `Capped at ${source.max_records_per_run} records (found ${rawRecords.length})`
      );
    }

    // ─── Process each record ──────────────────────────────────────
    let staged = 0;
    let skipped = 0;

    for (const rawRecord of cappedRecords) {
      try {
        // COMPLIANCE: Enforce field allowlist (strip any unexpected fields)
        const cleanRecord = enforceFieldAllowlist(rawRecord as unknown as Record<string, unknown>);

        // COMPLIANCE: Validate record contains only factual data
        const issues = validateRecord(cleanRecord);
        if (issues.length > 0) {
          errors.push(
            `Skipped record (${cleanRecord.athlete_name || "unknown"}): ${issues.join(", ")}`
          );
          skipped++;
          continue;
        }

        // Build staging record with provenance
        const stagingRecord = buildStagingRecord(source, cleanRecord, url);

        // Attempt dedup match against existing profiles
        const match = await findMatchingProfile(supabase, cleanRecord);

        // Write to staging table
        const insertData: Record<string, unknown> = {
          run_id: run.id,
          source_id: source.id,
          athlete_name: stagingRecord.athlete_name,
          grad_class: stagingRecord.grad_class,
          raw_rank: stagingRecord.raw_rank,
          event: stagingRecord.event,
          school: stagingRecord.school,
          state: stagingRecord.state,
          source_url: stagingRecord.source_url,
          source_name: stagingRecord.source_name,
          source_fetched_at: stagingRecord.source_fetched_at,
          record_hash: stagingRecord.record_hash,
          confidence: stagingRecord.confidence,
          status: "pending",
        };

        if (match) {
          insertData.matched_profile_id = match.profile_id;
          insertData.match_confidence = match.confidence;
          insertData.match_method = match.method;
        }

        // Check for existing record with same hash (dedup)
        const { data: existingRows, error: dedupError } = await supabase
          .from("ingestion_staging")
          .select("id, status")
          .eq("source_id", source.id)
          .eq("record_hash", stagingRecord.record_hash);

        if (dedupError) {
          errors.push(`Dedup query failed for ${cleanRecord.athlete_name}: ${dedupError.message} — inserting anyway`);
          // Don't skip — try the insert
        } else {
          const hasDuplicate = (existingRows ?? []).some(
            (r) => r.status !== "rejected" && r.status !== "duplicate"
          );

          if (hasDuplicate) {
            errors.push(`Dedup skip: ${cleanRecord.athlete_name} (hash ${stagingRecord.record_hash} already exists)`);
            skipped++;
            continue;
          }
        }

        const { error: insertError } = await supabase
          .from("ingestion_staging")
          .insert(insertData);

        if (insertError) {
          errors.push(
            `Failed to stage ${cleanRecord.athlete_name}: ${insertError.message}`
          );
          skipped++;
        } else {
          staged++;
        }
      } catch (recordError) {
        const msg =
          recordError instanceof Error ? recordError.message : String(recordError);
        errors.push(`Record processing error: ${msg}`);
        skipped++;
      }
    }

    // ─── Update run with results ──────────────────────────────────
    await supabase
      .from("ingestion_runs")
      .update({
        status: "completed",
        records_found: rawRecords.length,
        records_staged: staged,
        records_skipped: skipped,
        error_message: errors.length > 0 ? errors.join("\n") : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    // ─── Audit log ────────────────────────────────────────────────
    await supabase.from("audit_log").insert({
      actor_user_id: triggeredBy,
      action: "ingestion_run_completed",
      entity: "ingestion_run",
      entity_id: run.id,
      context: {
        source_key: source.key,
        source_url: url,
        records_found: rawRecords.length,
        records_staged: staged,
        records_skipped: skipped,
      },
    });

    return {
      run: {
        ...run,
        status: "completed",
        records_found: rawRecords.length,
        records_staged: staged,
        records_skipped: skipped,
        error_message: errors.length > 0 ? errors.join("\n") : null,
        completed_at: new Date().toISOString(),
      },
      staged,
      skipped,
      errors,
    };
  } catch (pipelineError) {
    // ─── Mark run as failed ─────────────────────────────────────
    const errorMsg =
      pipelineError instanceof Error
        ? pipelineError.message
        : String(pipelineError);

    await supabase
      .from("ingestion_runs")
      .update({
        status: "failed",
        error_message: errorMsg,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return {
      run: {
        ...run,
        status: "failed",
        error_message: errorMsg,
        completed_at: new Date().toISOString(),
      },
      staged: 0,
      skipped: 0,
      errors: [errorMsg, ...errors],
    };
  }
}
