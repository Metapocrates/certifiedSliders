import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";
import { normalizeAthleticNetProfileUrl, makeNonce } from "@/lib/external/athleticnet";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const supabase = createSupabaseServer();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { provider, profileUrl } = await req.json();

    if (provider !== "athleticnet") {
        return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    let externalId: string, canonicalUrl: string;
    try {
        ({ externalId, canonicalUrl } = normalizeAthleticNetProfileUrl(profileUrl));
    } catch (e: any) {
        return NextResponse.json({ error: e.message ?? "Invalid profile URL" }, { status: 400 });
    }

    const nonce = makeNonce();

    // Upsert the identity for this user+provider (unique)
    const { data, error } = await supabase
        .from("external_identities")
        .upsert(
            {
                user_id: user.id,
                provider,
                external_id: externalId,
                profile_url: canonicalUrl,
                nonce,
                verified: false,
                verified_at: null,
            },
            { onConflict: "provider,user_id" }
        )
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Instructions for the UI: user posts this nonce to their Athletic.net feed/profile.
    const instructions = [
        "Open your Athletic.net profile.",
        "Create a public feed post (or add to your About section).",
        `Paste this exact line: CS-VERIFY ${nonce}`,
        "Publish, then come back here and click 'Check Verification'.",
    ].join("\n");

    return NextResponse.json({
        provider,
        canonicalUrl,
        externalId,
        nonce,
        instructions,
    });
}
