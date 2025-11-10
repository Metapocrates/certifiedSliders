import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

/**
 * GET /api/coach/csv-limit?program={program_id}
 * Get CSV export row limit for a program
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const programId = searchParams.get("program");

  if (!programId) {
    return NextResponse.json({ limit: 10, error: "Missing program parameter" }, { status: 400 });
  }

  const supabase = createSupabaseServer();

  // Check if user is authenticated and has access to this program
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ limit: 10, error: "Unauthorized" }, { status: 401 });
  }

  // Verify user has access to this program
  const { data: membership } = await supabase
    .from("program_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ limit: 10, error: "Access denied" }, { status: 403 });
  }

  // Get CSV export limit
  const { data: limit, error } = await supabase.rpc("get_csv_export_limit", {
    _program_id: programId,
  });

  if (error) {
    console.error("Error getting CSV limit:", error);
    return NextResponse.json({ limit: 10, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ limit: limit || 10 });
}
