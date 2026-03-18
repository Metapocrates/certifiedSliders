import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { runIngestionPipeline } from "@/lib/ingestion/pipeline";
import type { IngestionSource } from "@/lib/ingestion/types";

/**
 * POST /api/admin/ingestion — Trigger an ingestion run
 * GET  /api/admin/ingestion — List sources, runs, and staging records
 */

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin
    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRow) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { source_key, url } = body;

    if (!source_key || !url) {
      return NextResponse.json(
        { error: "source_key and url are required" },
        { status: 400 }
      );
    }

    // Get source config
    const { data: source, error: sourceError } = await supabase
      .from("ingestion_sources")
      .select("*")
      .eq("key", source_key)
      .single();

    if (sourceError || !source) {
      return NextResponse.json(
        { error: `Source not found: ${source_key}` },
        { status: 404 }
      );
    }

    // Use admin client for pipeline (bypasses RLS for writes)
    const adminSupabase = createSupabaseAdmin();

    const result = await runIngestionPipeline(
      adminSupabase,
      source as IngestionSource,
      url,
      user.id
    );

    return NextResponse.json({
      ok: true,
      run_id: result.run.id,
      status: result.run.status,
      records_found: result.run.records_found,
      records_staged: result.staged,
      records_skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRow) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") ?? "sources";

    if (view === "sources") {
      const { data } = await supabase
        .from("ingestion_sources")
        .select("*")
        .order("created_at", { ascending: false });

      return NextResponse.json({ sources: data ?? [] });
    }

    if (view === "runs") {
      const sourceId = searchParams.get("source_id");
      let query = supabase
        .from("ingestion_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);

      if (sourceId) query = query.eq("source_id", sourceId);

      const { data } = await query;
      return NextResponse.json({ runs: data ?? [] });
    }

    if (view === "staging") {
      const status = searchParams.get("status") ?? "pending";
      const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

      // COMPLIANCE: Never return full ranking lists from a single source.
      // This endpoint returns staging records for admin review only.
      const { data } = await supabase
        .from("ingestion_staging")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(limit);

      return NextResponse.json({ staging: data ?? [] });
    }

    return NextResponse.json({ error: "Invalid view parameter" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
