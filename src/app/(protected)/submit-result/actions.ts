// src/app/(protected)/submit-result/actions.ts
"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";

const ConfirmSchema = z.object({
    source: z.enum(["athleticnet", "milesplit", "other"]).default("athleticnet"),
    proofUrl: z.string().url(),
    event: z.string().min(1),
    markText: z.string().min(1),              // raw display (e.g., "14.76", "4:12.31", "6-02")
    markSeconds: z.number().nullable(),       // normalized seconds for time events
    timing: z.enum(["FAT", "Hand"]).nullable(),
    wind: z.number().nullable().optional(),   // m/s
    season: z.enum(["indoor", "outdoor"]).default("outdoor"),
    meetName: z.string().min(1),
    meetDate: z.string().min(1),              // YYYY-MM-DD
});

export type ConfirmInput = z.infer<typeof ConfirmSchema>;

export async function confirmSubmitAction(payload: ConfirmInput) {
    const parsed = ConfirmSchema.safeParse(payload);
    if (!parsed.success) {
        return { ok: false, error: parsed.error.flatten() };
    }

    const user = await getSessionUser();
    if (!user) return { ok: false, error: { formErrors: ["You must be signed in."] } };

    const supabase = createSupabaseServer();

    // Compute adjusted mark if time-based
    const seconds = parsed.data.markSeconds;
    let markSecondsAdj: number | null = null;

    if (typeof seconds === "number") {
        // Prefer your RPC for canonical adjustments
        const { data: adj, error: rpcErr } = await supabase.rpc("adjust_time", {
            _seconds: seconds,
            _event: parsed.data.event,
            _season: parsed.data.season,
            _timing: parsed.data.timing ?? "FAT",
        });

        if (!rpcErr && typeof adj === "number") {
            markSecondsAdj = adj;
        } else {
            // Simple fallback if RPC missing or errors
            if (parsed.data.timing === "Hand") {
                const sprintEvents = new Set(["100", "200", "400", "110H", "100H"]);
                markSecondsAdj = sprintEvents.has(parsed.data.event) ? seconds + 0.24 : seconds;
            } else {
                markSecondsAdj = seconds;
            }
        }
    }

    const { error: insertErr } = await supabase.from("results").insert({
        athlete_id: user.id, // adjust if your athlete_id differs from auth.user.id
        event: parsed.data.event,
        mark: parsed.data.markText,
        mark_seconds: seconds,
        mark_seconds_adj: markSecondsAdj,
        mark_metric: seconds === null ? null : "time",
        timing: parsed.data.timing,
        wind: parsed.data.wind ?? null,
        season: parsed.data.season,
        status: "pending",
        source: parsed.data.source,
        proof_url: parsed.data.proofUrl,
        meet_name: parsed.data.meetName,
        meet_date: parsed.data.meetDate,
    });

    if (insertErr) {
        return { ok: false, error: { formErrors: [insertErr.message] } };
    }

    return { ok: true };
}
