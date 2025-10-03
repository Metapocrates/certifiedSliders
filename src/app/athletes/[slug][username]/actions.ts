"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";

export async function requestClaimAction(formData: FormData) {
    const athleteId = formData.get("athlete_id") as string | null;
    const slug = formData.get("slug") as string | null;
    const evidenceUrl = (formData.get("evidence_url") as string | null)?.trim() || null;
    const evidenceKind = (formData.get("evidence_kind") as string | null) || null;

    if (!athleteId || !slug) return { ok: false, error: "Missing athlete_id or slug." };

    const user = await getSessionUser();
    if (!user) return { ok: false, error: "You must be signed in to claim a profile." };

    const supabase = createSupabaseServer();
    const { data, error } = await supabase.rpc("request_claim", {
        p_athlete_id: athleteId,
        p_evidence_url: evidenceUrl,
        p_evidence_kind: evidenceKind,
    });

    if (error) return { ok: false, error: error.message || "Failed to submit claim." };

    // 🔁 updated to plural route
    revalidatePath(`/athletes/${slug}`, "page");
    return { ok: true, data };
}
