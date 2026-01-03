import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function POST() {
    const supabase = await createSupabaseServer();
    // Clear local session and all cookies
    await supabase.auth.signOut({ scope: 'local' });
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"), {
        status: 302,
    });
}
