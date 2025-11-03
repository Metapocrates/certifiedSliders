"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/compat";

const ConfirmInputSchema = z.object({
    source: z.enum(["athleticnet", "milesplit", "other"]),
    proofUrl: z.string().url().max(2048),
    event: z.string().min(1),
    markText: z.string().min(1),
    markSeconds: z.number().nullable(),
    timing: z.enum(["FAT", "hand"]).nullable(),
    wind: z.number().nullable(),
    season: z.enum(["indoor", "outdoor"]),
    meetName: z.string().min(1),
    meetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ConfirmInput = z.infer<typeof ConfirmInputSchema>;

export type ConfirmActionResult =
    | { ok: true }
    | {
        ok: false;
        error?: {
            formErrors?: string[];
            fieldErrors?: Record<string, string[]>;
        };
        code?: string;
    };

export async function confirmSubmitAction(
    input: ConfirmInput
): Promise<ConfirmActionResult> {
    const supabase = createSupabaseServer();

    // ✅ Auth
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user ?? null;
    if (!user) {
        return { ok: false, error: { formErrors: ["You must be signed in."] } };
    }

    if (input.source === "athleticnet") {
        return {
            ok: false,
            error: { formErrors: ["Athletic.net submissions use the secure workflow." ] },
        };
    }

    // ✅ Validate
    const parsed = ConfirmInputSchema.safeParse(input);
    if (!parsed.success) {
        const f = parsed.error.flatten();
        return {
            ok: false,
            error: { formErrors: f.formErrors, fieldErrors: f.fieldErrors },
        };
    }
    const v = parsed.data;

    // ✅ Require at least one verified Athletic.net link
    const { data: verifiedIdentity } = await supabase
        .from("external_identities")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider", "athleticnet")
        .eq("verified", true)
        .limit(1);

    const hasVerifiedIdentity = Boolean(verifiedIdentity && verifiedIdentity.length > 0);

    if (!hasVerifiedIdentity) {
        return {
            ok: false,
            error: {
                formErrors: [
                    "You need to verify an Athletic.net profile before submitting results."
                ],
            },
            code: "ATHLETICNET_REQUIRED",
        };
    }

    // ✅ Insert
    const { error } = await supabase
        .from("results")
        .insert({
            athlete_id: user.id,
            event: v.event,
            mark: v.markText,
            mark_seconds: v.markSeconds,
            timing: v.timing,
            wind: v.wind,
            season: v.season.toUpperCase(),
            meet_name: v.meetName,
            meet_date: v.meetDate,
            status: "pending",
            submitted_by: user.id,
            proof_url: v.proofUrl,
        })
        .select("id")
        .single();

    if (error) {
        return { ok: false, error: { formErrors: [`Insert failed: ${error.message}`] } };
    }

    return { ok: true };
}
