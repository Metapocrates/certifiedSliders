import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/** Supabase client posts here on auth changes to sync cookies */
export async function POST() {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.getSession(); // ensure cookies are set/updated
    return NextResponse.json({ ok: true });
}
