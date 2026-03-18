/**
 * Post-login redirect API
 *
 * Returns JSON with the redirect destination based on user's role
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserRole } from "@/lib/roles";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ redirectTo: "/login" });
  }

  // Check for explicit next parameter
  const searchParams = request.nextUrl.searchParams;
  const next = searchParams.get("next");

  // If next parameter exists and is valid, use it (but never redirect to /auth/post-login itself)
  if (next && /^\/(?!\/)/.test(next) && next !== "/auth/post-login" && !next.startsWith("/auth/post-login?")) {
    return NextResponse.json({ redirectTo: next });
  }

  // Get user's role and default route
  const roleInfo = await getUserRole(user.id);

  if (!roleInfo) {
    return NextResponse.json({ redirectTo: "/me" });
  }

  // Return the user's default dashboard route (with safety check)
  let destination = roleInfo.defaultRoute || "/me";

  // CRITICAL: Never redirect back to /auth/post-login to prevent redirect loops
  if (destination === "/auth/post-login" || destination.startsWith("/auth/post-login?")) {
    destination = "/me";
  }

  return NextResponse.json({ redirectTo: destination });
}
