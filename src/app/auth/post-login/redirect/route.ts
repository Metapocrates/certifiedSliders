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

  // If next parameter exists and is valid, use it
  if (next && /^\/(?!\/)/.test(next)) {
    return NextResponse.json({ redirectTo: next });
  }

  // Get user's role and default route
  const roleInfo = await getUserRole(user.id);

  if (!roleInfo) {
    return NextResponse.json({ redirectTo: "/me" });
  }

  // Return the user's default dashboard route
  return NextResponse.json({ redirectTo: roleInfo.defaultRoute });
}
