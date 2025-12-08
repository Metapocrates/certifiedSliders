import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

/**
 * GET /api/hs/search-athletes?team={team_id}&q={search}
 * Search athletes for invitation
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("team");
  const query = searchParams.get("q");

  if (!teamId || !query) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user has permission to invite athletes on this team
  const { data: staffRecord } = await supabase
    .from("team_staff")
    .select("id, can_invite_athletes")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!staffRecord || !staffRecord.can_invite_athletes) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Search athletes
  const { data: results, error } = await supabase.rpc("rpc_search_athletes_for_invite", {
    p_team_id: teamId,
    p_search: query,
    p_limit: 20,
  });

  if (error) {
    console.error("Error searching athletes:", error);
    return NextResponse.json({ error: "Failed to search athletes" }, { status: 500 });
  }

  return NextResponse.json({ results: results || [] });
}
