// src/app/(protected)/admin/results/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

async function assertAdmin() {
    const supabase = createSupabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user ?? null;
    if (!user) return { ok: false, error: "Not signed in." as const, supabase };

    const { data: adminRow, error } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
    if (error || !adminRow) return { ok: false, error: "Unauthorized." as const, supabase };

    return { ok: true as const, supabase };
}

export async function approveResultAction(formData: FormData) {
    const gate = await assertAdmin();
    if (!gate.ok) return gate;

    const id = Number(formData.get("id"));
    if (!id) return { ok: false, error: "Missing id." };

    const { supabase } = gate;
    const { error } = await supabase
        .from("results")
        .update({
            status: "verified",
            // if you want to clear any previous rejection reason on approve:
            reject_reason: null,
        })
        .eq("id", id)
        .select("id")
        .maybeSingle();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/(protected)/admin/results");
    return { ok: true };
}

export async function rejectResultAction(formData: FormData) {
    const gate = await assertAdmin();
    if (!gate.ok) return gate;

    const id = Number(formData.get("id"));
    // Persist reason (trim empty to null)
    const rawReason = (formData.get("reason") as string | null) ?? null;
    const reason =
        typeof rawReason === "string" ? rawReason.trim().slice(0, 2000) || null : null;

    if (!id) return { ok: false, error: "Missing id." };

    const { supabase } = gate;
    const { error } = await supabase
        .from("results")
        .update({
            status: "rejected",
            reject_reason: reason, // <-- persists the reason
        })
        .eq("id", id)
        .select("id")
        .maybeSingle();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/(protected)/admin/results");
    return { ok: true };
}