// src/app/(protected)/submit-result/actions.ts
"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/compat";

/** ----- Types your page imports ----- **/
export type ConfirmInput = {
    source: "athleticnet" | "milesplit" | "other";
    proofUrl: string;
    event: string;
    markText: string;
    markSeconds: number | null;
    timing: "FAT" | "Hand" | null;
    wind: number | null;
    season: "indoor" | "outdoor";
    meetName: string;
    meetDate: string; // YYYY-MM-DD
};

type ActionOk = { ok: true };
type ActionErr = { ok: false; error: { formErrors?: string[] } };
export type ConfirmResult = ActionOk | ActionErr;

/** ----- Validation ----- **/
const ConfirmSchema = z.object({
    source: z.enum(["athleticnet", "milesplit", "other"]),
    proofUrl: z
        .string()
        .url("Proof URL must be a valid URL")
        .max(2000, "URL is too long"),
    event: z.string().trim().min(1, "Event is required").max(64),
    markText: z.string().trim().min(1, "Mark (display) is required").max(32),
    markSeconds: z.number().finite().nonnegative().nullable(),
    timing: z.enum(["FAT", "Hand"]).nullable(),
    wind: z.number().finite().nullable(),
    season: z.enum(["indoor", "outdoor"]),
    meetName: z.string().trim().min(1, "Meet name is required").max(160),
    meetDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for meet date"),
});

/** Small helper to strip undefined fields (so we only send what exists) */
function compact<T extends Record<string, any>>(obj: T): Partial<T> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) out[k] = v;
    }
    return out as Partial<T>;
}

/** ----- Server action: inserts pending result ----- **/
export async function confirmSubmitAction(input: ConfirmInput): Promise<ConfirmResult> {
    const parsed = ConfirmSchema.safeParse(input);
    if (!parsed.success) {
        const formErrors = [
            ...Object.values(parsed.error.flatten().fieldErrors).flat().filter(Boolean),
            ...(parsed.error.flatten().formErrors ?? []),
        ];
        return { ok: false, error: { formErrors: formErrors.length ? formErrors : ["Invalid form"] } };
    }

    const supabase = createSupabaseServer();

    // Must be authenticated
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
        return { ok: false, error: { formErrors: ["You must be signed in."] } };
    }

    // We use the auth uid as athlete_id (your profiles.id == auth.uid()).
    const athleteId = user.id;

    const v = parsed.data;

    // Prepare insert payload. Keep fields conservative to avoid unknown-column errors.
    const row = compact({
        athlete_id: athleteId,
        source: v.source,
        proof_url: v.proofUrl,
        event: v.event,
        mark: v.markText,
        // If your schema has raw seconds -> include mark_seconds; otherwise omit.
        mark_seconds: v.markSeconds ?? undefined,
        timing: v.timing ?? undefined,
        wind: v.wind ?? undefined,
        season: v.season,
        meet_name: v.meetName,
        meet_date: v.meetDate, // assumes DATE column
        status: "pending", // admin will approve/reject
        submitted_by: athleteId, // safe if column exists; ignored if not
    });

    const { error } = await supabase.from("results").insert(row).single();

    if (error) {
        // Surface RLS / FK / column errors
        return { ok: false, error: { formErrors: [error.message] } };
    }

    // Optional: trigger a refresh of mv_best_event if you use it for reads
    try {
        await supabase.rpc("refresh_mv_best_event");
    } catch {
        // ignore if not present
    }

    return { ok: true };
}
