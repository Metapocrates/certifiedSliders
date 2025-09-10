import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";
import { pageContainsNonce } from "@/lib/external/athleticnet";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const supabase = createSupabaseServer();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { provider = "athleticnet" } = await req.json();

    const { data: row, error } = await supabase
        .from("external_identities")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .single();

    if (error || !row) {
        return NextResponse.json({ error: "No pending verification found." }, { status: 404 });
    }

    const ok = await pageContainsNonce(row.profile_url, row.nonce);
    if (!ok) {
        return NextResponse.json({ verified: false, reason: "Nonce not found on profile. Make sure your post is public and saved." }, { status: 200 });
    }

    const { error: upErr } = await supabase
        .from("external_identities")
        .update({ verified: true, verified_at: new Date().toISOString() })
        .eq("id", row.id);

    if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    return NextResponse.json({ verified: true, provider, externalId: row.external_id, profileUrl: row.profile_url });
}
