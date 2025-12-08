// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

/**
 * Receives tokens from the client (AuthListener) and sets HTTP-only auth cookies
 * so RLS can see auth.uid() on the server.
 */
export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const next = url.searchParams.get("next") ?? "/auth/post-login"; // Use role-based routing
    const pendingType = url.searchParams.get("pending_type");

    if (!code) {
        // No code provided — drop back to sign-in with an error hint
        const redirect = new URL(`/signin?error=missing_code`, url.origin);
        return NextResponse.redirect(redirect);
    }

    const supabase = await createSupabaseServer();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
        const redirect = new URL(`/signin?error=${encodeURIComponent(error.message)}`, url.origin);
        return NextResponse.redirect(redirect);
    }

    // If this is a new Google OAuth user from registration (pending_type provided)
    // set their user type via RPC
    if (pendingType && sessionData?.user) {
        try {
            await supabase.rpc("rpc_set_user_type", {
                _user_type: pendingType,
            });
        } catch (typeErr) {
            console.error("Failed to set user type in callback:", typeErr);
            // Don't fail the auth flow, just log it
        }
    }

    // Successful exchange; send the user along to their destination.
    const redirect = new URL(next, url.origin);
    return NextResponse.redirect(redirect);
}

export async function POST(req: Request) {
    const supabase = await createSupabaseServer();

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
