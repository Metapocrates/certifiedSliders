import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { runIngestionPipeline } from "@/lib/ingestion/pipeline";
import type { IngestionSource } from "@/lib/ingestion/types";

/**
 * POST /api/cron/ingestion — Scheduled ingestion for all enabled sources
 *
 * Triggered by Vercel Cron or external scheduler.
 * Runs ingestion for each enabled source with their configured base_url.
 *
 * Security: Requires x-cron-secret header matching CRON_SECRET env var.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const expectedSecret = process.env.CRON_SECRET;
    const providedSecret = req.headers.get("x-cron-secret");

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    // Get all enabled sources
    const { data: sources, error } = await supabase
      .from("ingestion_sources")
      .select("*")
      .eq("is_enabled", true);

    if (error || !sources || sources.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No enabled sources to process",
        runs: [],
      });
    }

    const results = [];

    for (const source of sources as IngestionSource[]) {
      try {
        const result = await runIngestionPipeline(
          supabase,
          source,
          source.base_url,
          null // cron-triggered, no user
        );

        results.push({
          source: source.key,
          status: result.run.status,
          staged: result.staged,
          skipped: result.skipped,
          errors: result.errors.length,
        });
      } catch (sourceError) {
        const msg =
          sourceError instanceof Error ? sourceError.message : String(sourceError);
        results.push({
          source: source.key,
          status: "failed",
          error: msg,
        });
      }
    }

    return NextResponse.json({ ok: true, runs: results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Also support GET for Vercel Cron compatibility
export async function GET(req: NextRequest) {
  return POST(req);
}
