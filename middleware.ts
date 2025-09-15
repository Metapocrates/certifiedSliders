// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
    // Must create a response object and pass it to the Supabase client
    const res = NextResponse.next();

    // Supabase client bound to this request/response (Edge-safe)
    const supabase = createMiddlewareClient({ req, res });

    // Ensure we have the session (refreshes cookie if needed)
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // If no user → go to signin
    if (!user) {
        return NextResponse.redirect(new URL("/signin", req.url));
    }

    // Check admins table for this user
    const { data: adminRow, error } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    // Not an admin → send home
    if (error || !adminRow) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    // Allowed through
    return res;
}

// Only run on /admin paths
export const config = {
    matcher: ["/admin/:path*"],
};
