import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const runtime = "nodejs";

// GET /api/athletes/[profileId]/events/[event]/history
// Returns all results for a specific athlete and event, paginated
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string; event: string }> }
) => {
  const resolvedParams = await params;
  const supabase = await createSupabaseServer();
  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = (page - 1) * limit;

  // Decode event name (it may be URL-encoded)
  const eventName = decodeURIComponent(resolvedParams.event);

  // First, get the athlete ID from profile_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("profile_id", resolvedParams.profileId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { error: "Athlete not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Fetch results for this athlete and event
  const { data: results, error, count } = await supabase
    .from("results")
    .select("*", { count: "exact" })
    .eq("athlete_id", profile.id)
    .eq("event", eventName)
    .in("status", ["verified", "approved"])  // Only show approved results
    .order("meet_date", { ascending: false, nullsFirst: false })
    .order("mark_seconds", { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message, code: "DB_ERROR" },
      { status: 500 }
    );
  }

  // Format results with additional computed fields
  const formattedResults = (results || []).map((r) => {
    const isPR = r.is_pr || false;
    const windDisplay = r.wind != null
      ? `${r.wind > 0 ? "+" : ""}${r.wind.toFixed(1)}`
      : null;

    return {
      id: r.id,
      mark: r.mark || formatMark(r.mark_seconds),
      markSeconds: r.mark_seconds,
      wind: windDisplay,
      windValue: r.wind,
      isWindLegal: r.is_wind_legal ?? true,
      meetName: r.meet_name,
      meetDate: r.meet_date,
      season: r.season,
      proofUrl: r.proof_url,
      isPR,
      status: r.status,
      grade: r.grade,
    };
  });

  return NextResponse.json({
    ok: true,
    results: formattedResults,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
};

// Helper to format mark_seconds as M:SS.SS for readability
function formatMark(seconds: number | null): string {
  if (seconds == null) return "—";
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return mm > 0 ? `${mm}:${ss.toFixed(2).padStart(5, "0")}` : ss.toFixed(2);
}
