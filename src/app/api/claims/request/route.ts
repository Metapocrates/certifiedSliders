import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const { athlete_id, evidence_url, evidence_kind, slug } = await req.json();

        if (!athlete_id) {
            return NextResponse.json({ ok: false, error: "Missing athlete_id." }, { status: 400 });
        }

        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const supabase = await createSupabaseServer();
        const { data, error } = await supabase.rpc("request_claim", {
            p_athlete_id: athlete_id,
            p_evidence_url: evidence_url || null,
            p_evidence_kind: evidence_kind || null,
        });

        if (error) {
            return NextResponse.json({ ok: false, error: error.message || "Failed to submit claim." }, { status: 400 });
        }

        if (slug) revalidatePath(`/athletes/${slug}`, "page");
        return NextResponse.json({ ok: true, data });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message ?? "Unexpected error." }, { status: 500 });
    }
}
