import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

/**
 * GET /api/profile/can-submit-results
 * Check if user type allows result submission (athletes and parents only)
 */
export async function GET() {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ canSubmit: false, error: "Not authenticated" }, { status: 401 });
  }

  // Use RPC function to check if user can submit results
  const { data: canSubmit, error } = await supabase.rpc("can_submit_results");

  if (error) {
    console.error("Error checking user permissions:", error);
    return NextResponse.json({ canSubmit: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ canSubmit: canSubmit ?? false });
}
