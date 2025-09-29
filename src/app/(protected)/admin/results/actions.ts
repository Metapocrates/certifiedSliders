// src/app/(protected)/admin/results/actions.ts
"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";

const IdSchema = z.object({ id: z.string().uuid() });
const RejectSchema = z.object({
    id: z.string().uuid(),
    reason: z.string().max(300).optional(),
});

export async function getPendingResultsAction() {
    const user = await getSessionUser();
    if (!user || !(await isAdmin(user.id))) {
        return { ok: false, error: "Unauthorized" };
    }

    const supabase = createSupabaseServer();

    const { data, error } = await supabase
        .from("results")
        .select(
            `
        id,
        athlete_id,
        event,
        mark,
        mark_seconds,
        timing,
        wind,
        season,
        proof_url,
        meet_name,
        meet_date,
        created_at,
        profiles:profiles!results_athlete_id_fkey (full_name, username, school_name, class_year)
      `
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
}

export async function approveResultAction(formData: FormData) {
    const parsed = IdSchema.safeParse({ id: String(formData.get("id") ?? "") });
    if (!parsed.success) return { ok: false, error: "Bad id" };

    const user = await getSessionUser();
    if (!user || !(await isAdmin(user.id))) {
        return { ok: false, error: "Unauthorized" };
    }

    const supabase = createSupabaseServer();

    // Try the RPC if available
    let rpcTried = false;
    try {
        rpcTried = true;
        const { error: rpcErr } = await supabase.rpc("verify_result", { _result_id: parsed.data.id });
        if (!rpcErr) {
            try {
                await supabase.rpc("refresh_mv_best_event");
            } catch { }
            return { ok: true };
        }
    } catch {
        // fall through to direct update
    }

    // Fallback: direct update
    const { error } = await supabase
        .from("results")
        .update({ status: "verified", verified_at: new Date().toISOString() })
        .eq("id", parsed.data.id);

    if (error) {
        return {
            ok: false,
            error: rpcTried ? `RPC failed; update failed: ${error.message}` : error.message,
        };
    }

    try {
        await supabase.rpc("refresh_mv_best_event");
    } catch { }

    return { ok: true };
}

export async function rejectResultAction(formData: FormData) {
    const parsed = RejectSchema.safeParse({
        id: String(formData.get("id") ?? ""),
        reason: String(formData.get("reason") ?? ""),
    });
    if (!parsed.success) return { ok: false, error: "Bad input" };

    const user = await getSessionUser();
    if (!user || !(await isAdmin(user.id))) {
        return { ok: false, error: "Unauthorized" };
    }

    const supabase = createSupabaseServer();
    const { error } = await supabase
        .from("results")
        .update({
            status: "rejected",
            reject_reason: parsed.data.reason || null,
            verified_at: null,
        })
        .eq("id", parsed.data.id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}
