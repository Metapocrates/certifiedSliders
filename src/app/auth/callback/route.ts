// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

/**
 * Receives tokens from the client (AuthListener) and sets HTTP-only auth cookies
 * so RLS can see auth.uid() on the server.
 */
export async function POST(req: Request) {
    const supabase = createSupabaseServer();

    let access_token: string | null = null;
    let refresh_token: string | null = null;

    try {
        const body = await req.json();
        access_token = body?.access_token ?? null;
        refresh_token = body?.refresh_token ?? null;
    } catch {
        // no body provided; fall through to just hydrate cookies from current session
    }

    if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
    } else {
        // Touch session so helper syncs cookies even if tokens weren’t sent
        await supabase.auth.getSession();
    }

    return NextResponse.json({ ok: true });
}