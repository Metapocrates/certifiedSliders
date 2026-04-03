/**
 * Post-login redirect API
 *
 * Returns JSON with the redirect destination based on user's role
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserRole } from "@/lib/roles";
import { createSupabaseServer } from "@/lib/supabase/compat";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ pendingSession: true }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const searchParams = request.nextUrl.searchParams;
  const next = searchParams.get("next");

  if (next && /^\/(?!\/)/.test(next) && next !== "/auth/post-login" && !next.startsWith("/auth/post-login?")) {
    return NextResponse.json({ redirectTo: next }, { headers: NO_STORE_HEADERS });
  }

  const roleInfo = await getUserRole(user.id);
  let destination = roleInfo?.defaultRoute || "/me";

  if (destination === "/auth/post-login" || destination.startsWith("/auth/post-login?")) {
    destination = "/me";
  }

  return NextResponse.json({ redirectTo: destination }, { headers: NO_STORE_HEADERS });
}
