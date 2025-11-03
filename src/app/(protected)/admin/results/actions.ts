// src/app/(protected)/admin/results/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
            rejection_reason: null,
        })
        .eq("id", id)
        .select("id")
        .maybeSingle();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/results");
    redirect("/admin/results");
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

    console.log("Rejecting result:", id, "with reason:", reason);

    const { error, data } = await supabase
        .from("results")
        .update({
            status: "rejected",
            rejection_reason: reason, // <-- persists the reason
        })
        .eq("id", id)
        .select("id")
        .maybeSingle();

    console.log("Reject result:", { error, data });

    if (error) {
        console.error("Reject error:", error);
        return { ok: false, error: error.message };
    }

    revalidatePath("/admin/results");
    redirect("/admin/results");
}

export async function deleteResultAction(formData: FormData) {
    const gate = await assertAdmin();
    if (!gate.ok) return gate;

    const id = Number(formData.get("id"));
    if (!id) return { ok: false, error: "Missing id." };

    const { supabase } = gate;

    console.log("Deleting result:", id);

    // First delete related proofs (cascade delete)
    const { error: proofsError, data: proofsData } = await supabase
        .from("proofs")
        .delete()
        .eq("result_id", id)
        .select();

    console.log("Deleted proofs:", { proofsError, count: proofsData?.length });

    // Then delete the result
    const { error, data } = await supabase
        .from("results")
        .delete()
        .eq("id", id)
        .select();

    console.log("Deleted result:", { error, data });

    if (error) {
        console.error("Delete error:", error);
        return { ok: false, error: error.message };
    }

    if (!data || data.length === 0) {
        console.error("No result was deleted - might not exist or permission denied");
        return { ok: false, error: "Result not found or permission denied" };
    }

    revalidatePath("/admin/results");
    redirect("/admin/results");
}