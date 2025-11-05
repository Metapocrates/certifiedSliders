import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type UpdateVisibilityBody = {
  visibilityMap?: Record<string, boolean>;
};

function jsonError(message: string, code: string, status = 400) {
  return NextResponse.json({ error: message, code }, { status });
}

export const POST = async (req: NextRequest) => {
  const user = await getSessionUser();
  if (!user) {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  let body: UpdateVisibilityBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body", "BAD_REQUEST");
  }

  if (!body.visibilityMap || typeof body.visibilityMap !== "object") {
    return jsonError("Missing or invalid visibilityMap", "MISSING_VISIBILITY_MAP");
  }

  const admin = createSupabaseAdmin();

  // Convert string keys to numbers
  const resultIds = Object.keys(body.visibilityMap).map(Number).filter((id) => !isNaN(id));

  if (resultIds.length === 0) {
    return jsonError("No valid result IDs provided", "NO_RESULTS");
  }

  // Verify all results belong to this user
  const { data: results, error: fetchErr } = await admin
    .from("results")
    .select("id, athlete_id")
    .in("id", resultIds);

  if (fetchErr) {
    return jsonError(fetchErr.message, "DB_ERROR", 500);
  }

  if (!results || results.length === 0) {
    return jsonError("No results found", "NO_RESULTS");
  }

  // Check ownership
  const unauthorizedResults = results.filter((r) => r.athlete_id !== user.id);
  if (unauthorizedResults.length > 0) {
    return jsonError("You do not have access to one or more results", "NOT_OWNER", 403);
  }

  // Update each result's visibility
  const updates = resultIds.map((id) => {
    const visible = body.visibilityMap![String(id)] ?? true;
    return admin
      .from("results")
      .update({ visible_on_profile: visible })
      .eq("id", id)
      .eq("athlete_id", user.id);
  });

  try {
    await Promise.all(updates);
  } catch (err: any) {
    return jsonError(err?.message ?? "Failed to update visibility", "UPDATE_ERROR", 500);
  }

  // Refresh the materialized view to reflect changes immediately
  try {
    await admin.rpc("refresh_materialized_view", { view_name: "mv_best_event" });
  } catch (err: any) {
    // Log error but don't fail the request - fallback query will still work
    console.error("Failed to refresh materialized view:", err);
  }

  return NextResponse.json({ ok: true, updated: resultIds.length });
};
