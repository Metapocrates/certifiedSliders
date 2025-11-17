/**
 * Post-login redirect handler
 *
 * Determines user's role and redirects to appropriate dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserRole } from "@/lib/roles";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServer();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not authenticated, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check for explicit next parameter
  const searchParams = request.nextUrl.searchParams;
  const next = searchParams.get("next");

  // If next parameter exists and is valid, use it
  if (next && /^\/(?!\/)/.test(next)) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  // Get user's role and default route
  const roleInfo = await getUserRole(user.id);

  if (!roleInfo) {
    // Fallback to /me if no role info
    return NextResponse.redirect(new URL("/me", request.url));
  }

  // Redirect to user's default dashboard
  return NextResponse.redirect(new URL(roleInfo.defaultRoute, request.url));
}
