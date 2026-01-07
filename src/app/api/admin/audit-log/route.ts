import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

/**
 * POST /api/admin/audit-log
 *
 * Log an admin action for audit purposes.
 * Only admins can write to the audit log.
 */
export async function POST(req: Request) {
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

    // Parse request body
    const body = await req.json();
    const { action, portalKey, impersonatedUserId, meta } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // Valid actions for portal testing
    const validActions = [
      "SET_PORTAL_OVERRIDE",
      "CLEAR_PORTAL_OVERRIDE",
      "START_IMPERSONATION",
      "STOP_IMPERSONATION",
    ];

    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Insert audit log entry
    const { error: insertError } = await supabase.from("admin_portal_audit_logs").insert({
      admin_id: user.id,
      action,
      portal_key: portalKey || null,
      impersonated_user_id: impersonatedUserId || null,
      meta: meta || null,
    });

    if (insertError) {
      // If the table doesn't exist, try to create it
      if (insertError.code === "42P01") {
        // Table doesn't exist - log to console and continue
        console.warn("admin_portal_audit_logs table not found. Skipping audit log.");
        return NextResponse.json({ success: true, warning: "Audit log table not found" });
      }
      throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error writing audit log:", error);
    return NextResponse.json(
      { error: "Failed to write audit log" },
      { status: 500 }
    );
  }
}
