import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (code) {
        const supabase = createRouteHandlerClient({ cookies });
        await supabase.auth.exchangeCodeForSession(code);
    }
    return NextResponse.redirect(new URL("/me", request.url));
}

export async function POST() {
    const supabase = createRouteHandlerClient({ cookies });
    // Touch the session so the helper sets/clears cookies
    await supabase.auth.getSession();
    return NextResponse.json({ ok: true });
}
