// src/app/actions/submit-result.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { normalizeMark } from "@/lib/mark";

const SubmitSchema = z.object({
    event: z.string().min(1),
    mark: z.string().min(1),
    timing: z.enum(["FAT", "HAND"]).default("FAT"),
    wind: z
        .string()
        .transform((v) => (v === "" || v === undefined ? null : Number(v)))
        .pipe(z.number().nullable())
        .refine((v) => v === null || (typeof v === "number" && isFinite(v)), {
            message: "Wind must be a number (e.g., -1.5, 2.0) or empty",
        }),
    season: z.enum(["indoor", "outdoor"]).optional(),
    meet_name: z.string().min(1),
    meet_date: z.string().min(1), // YYYY-MM-DD from <input type="date">
    proof_url: z.string().url().optional().or(z.literal("")),
    source: z.string().optional(),
});

export type SubmitResultState =
    | { ok: true; id: string }
    | { ok: false; error: string };

export async function submitResultAction(
    _prevState: SubmitResultState | undefined,
    formData: FormData
): Promise<SubmitResultState> {
    const supabase = createSupabaseServer();

    // Require auth
    const {
        data: { user },
        error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
        return { ok: false, error: "You must be signed in to submit a result." };
    }

    const raw = Object.fromEntries(formData.entries());
    const parsed = SubmitSchema.safeParse({
        event: String(raw.event || ""),
        mark: String(raw.mark || ""),
        timing: (raw.timing as string) === "HAND" ? "HAND" : "FAT",
        wind: String(raw.wind || ""),
        season: (raw.season as string) === "indoor" ? "indoor" : "outdoor",
        meet_name: String(raw.meet_name || ""),
        meet_date: String(raw.meet_date || ""),
        proof_url: raw.proof_url ? String(raw.proof_url) : undefined,
        source: raw.source ? String(raw.source) : "user",
    });

    if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join("; ");

        return { ok: false, error: msg };
    }

    const v = parsed.data;
    const norm = normalizeMark(v.mark, v.event);

    const payload = {
        athlete_id: user.id, // adjust if your athlete mapping differs
        event: v.event,
        mark: v.mark,
        mark_seconds: norm.mark_seconds,
        mark_metric: norm.mark_metric,
        timing: v.timing,
        wind: v.wind,
        season: v.season ?? null,
        status: "pending" as const,
        source: v.source ?? "user",
        proof_url: v.proof_url && v.proof_url.length ? v.proof_url : null,
        meet_name: v.meet_name,
        meet_date: v.meet_date,
    };

    const { data, error } = await supabase
        .from("results")
        .insert(payload)
        .select("id")
        .maybeSingle();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/rankings");
    revalidatePath(`/athlete/${user.id}`);

    return { ok: true, id: data?.id ?? "" };
}
