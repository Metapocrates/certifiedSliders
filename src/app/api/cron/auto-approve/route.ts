import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

/**
 * Auto-approval cron endpoint
 *
 * This endpoint can be called by:
 * 1. Vercel Cron (recommended for production)
 * 2. GitHub Actions (alternative)
 * 3. Manual admin trigger
 *
 * Security: Should be protected by cron secret or admin auth
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();

  // Security check: Verify cron secret or admin auth
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret) {
    // Fallback: Check if requester is admin
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user ?? null;

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRow) {
      return NextResponse.json(
        { ok: false, error: "Forbidden - Admin only" },
        { status: 403 }
      );
    }
  }

  try {
    // Call the auto-approval function
    const { data, error } = await supabase.rpc("run_auto_approval");

    if (error) {
      console.error("[Auto-Approval] Error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    console.log("[Auto-Approval] Success:", data);

    return NextResponse.json({
      ok: true,
      ...data,
    });
  } catch (err: any) {
    console.error("[Auto-Approval] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

// Allow GET for manual admin testing
export async function GET(req: NextRequest) {
  return POST(req);
}
