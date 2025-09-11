import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST() {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"), {
        status: 302,
    });
}
