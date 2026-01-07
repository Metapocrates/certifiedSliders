import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

/**
 * GET /api/admin/portal-audit-logs
 *
 * Fetch recent portal testing audit logs for the current admin.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const { data: adminData } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminData) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Fetch recent audit logs for this admin
    const { data: logs, error } = await supabase
      .from("admin_portal_audit_logs")
      .select("id, admin_id, action, portal_key, impersonated_user_id, created_at, meta")
      .eq("admin_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === "42P01") {
        return NextResponse.json({ logs: [] });
      }
      throw error;
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
