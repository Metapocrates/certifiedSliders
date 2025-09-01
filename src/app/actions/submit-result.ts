"use server";

import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

import { normalizeMark } from "@/lib/mark";

const SubmitSchema = z.object({
    event_id: z.string().uuid(),
    mark: z.string().min(1),
    timing: z.enum(["FAT", "HAND"]).default("FAT"),
    wind: z.string().transform(v => (v === "" ? null : Number(v))).pipe(z.number().nullable()),
    season: z.enum(["indoor", "outdoor"]).optional(),
    meet_name: z.string().min(1),
    meet_date: z.string().min(1),
    proof_url: z.string().url().optional().or(z.literal("")),
    source: z.string().optional(),
});

export type SubmitResultState =
    | { ok: true; id: string }
    | { ok: false; error: string };

export async function submitResultAction(
    _prev: SubmitResultState | null,
    formData: FormData
): Promise<SubmitResultState> {
    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You must be signed in." };

    const raw = Object.fromEntries(formData.entries());
    const parsed = SubmitSchema.safeParse({
        event_id: String(raw.event_id || ""),
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
        const msg = parsed.error.issues.map(i => i.message).join("; ");
        return { ok: false, error: msg };
    }
    const v = parsed.data;

    // Look up event metadata
    const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("id, code, discipline, unit")
        .eq("id", v.event_id)
        .maybeSingle();
    if (evErr || !ev) return { ok: false, error: "Invalid event." };

    // Normalize by unit
    let mark_seconds: number | null = null;
    let mark_metric: number | null = null;

    if (ev.unit === "seconds") {
        mark_seconds = normalizeMark(v.mark, ev.code).mark_seconds;
    } else if (ev.unit === "meters") {
        mark_metric = parseDistanceToMeters(v.mark);
    }

    const payload = {
        athlete_id: user.id,
        event_id: ev.id,
        event: ev.code, // legacy string for now
        mark: v.mark,
        mark_seconds,
        mark_metric,
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

    return { ok: true, id: data?.id ?? "" };
}

// helpers
function parseDistanceToMeters(raw: string): number | null {
    if (!raw) return null;
    const s = raw.trim();
    if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s); // metric
    const m = s.match(/^(\d+)[-'\s](\d+(?:\.\d+)?)?/);  // feet-inches
    if (m) {
        const feet = parseFloat(m[1]);
        const inches = m[2] ? parseFloat(m[2]) : 0;
        return ((feet * 12) + inches) * 0.0254;
    }
    return null;
}
