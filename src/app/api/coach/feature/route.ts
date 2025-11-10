import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

/**
 * GET /api/coach/feature?program={program_id}&key={feature_key}
 * Check if a feature is enabled for a program
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const programId = searchParams.get("program");
  const featureKey = searchParams.get("key");

  if (!programId || !featureKey) {
    return NextResponse.json({ enabled: false, error: "Missing program or key parameter" }, { status: 400 });
  }

  const supabase = createSupabaseServer();

  // Check if user is authenticated and has access to this program
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ enabled: false, error: "Unauthorized" }, { status: 401 });
  }

  // Verify user has access to this program
  const { data: membership } = await supabase
    .from("program_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ enabled: false, error: "Access denied" }, { status: 403 });
  }

  // Check if feature is enabled
  const { data: enabled, error } = await supabase.rpc("is_feature_enabled", {
    _program_id: programId,
    _feature_key: featureKey,
  });

  if (error) {
    console.error("Error checking feature:", error);
    return NextResponse.json({ enabled: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ enabled: !!enabled });
}
