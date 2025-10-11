// src/app/api/profile/claim/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function POST(req: Request) {
    const supabase = createSupabaseServer();

    // Ensure caller is signed in
    const {
        data: { user },
        error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
        return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
    }

    // Read JSON body
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    const profileId = (body as { profileId?: string })?.profileId;
    if (!profileId) {
        return NextResponse.json({ ok: false, error: "Missing profileId" }, { status: 400 });
    }

    // Call the RLS-safe function
    const { error } = await supabase.rpc("claim_profile", { p_profile_id: profileId });
    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}