// src/app/(protected)/admin/results/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";

const IdSchema = z.object({ id: z.string().uuid() });
const RejectSchema = z.object({
    id: z.string().uuid(),
    reason: z.string().max(300).optional(),
});

async function requireAdmin() {
    const user = await getSessionUser();
    if (!user || !(await isAdmin(user.id))) {
        return { ok: false as const, error: "Unauthorized" as const, user: null };
    }
    return { ok: true as const, error: null, user };
}

export async function getPendingResultsAction() {
    const gate = await requireAdmin();
    if (!gate.ok) return { ok: false, error: gate.error };

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
        mark_seconds_adj,
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
        .limit(200);

    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
}

export async function approveResultAction(formData: FormData) {
    const parsed = IdSchema.safeParse({ id: String(formData.get("id") ?? "") });
    if (!parsed.success) return { ok: false, error: "Bad id" };

    const gate = await requireAdmin();
    if (!gate.ok) return { ok: false, error: gate.error };

    const supabase = createSupabaseServer();

    // Prefer RPC for any integrity/side-effects you have in SQL
    let usedRpc = false;
    let rpcErr: { message: string } | null = null;
    try {
        const { error } = await supabase
            .rpc("verify_result", { _result_id: parsed.data.id });
        usedRpc = true;
        rpcErr = error;
    } catch (e: any) {
        rpcErr = { message: "RPC threw (network/client)" };
    }

    if (rpcErr) {
        // Fallback to direct update
        const { error } = await supabase
            .from("results")
            .update({ status: "verified", verified_at: new Date().toISOString() })
            .eq("id", parsed.data.id);
        if (error) {
            return {
                ok: false,
                error: usedRpc
                    ? `RPC verify_result failed; update failed: ${error.message}`
                    : error.message,
            };
        }
    }

    // Refresh MV (best efforts)
    try {
        await supabase.rpc("refresh_mv_best_event");
    } catch {
        // ignore errors
    }

    // Nudge any caches
    revalidatePath("/rankings");
    revalidatePath("/");

    return { ok: true };
}

export async function rejectResultAction(formData: FormData) {
    const parsed = RejectSchema.safeParse({
        id: String(formData.get("id") ?? ""),
        reason: String(formData.get("reason") ?? ""),
    });
    if (!parsed.success) return { ok: false, error: "Bad input" };

    const gate = await requireAdmin();
    if (!gate.ok) return { ok: false, error: gate.error };

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

    // Rankings shouldn't change on reject, but nudge cache anyway
    revalidatePath("/rankings");
    return { ok: true };
}
