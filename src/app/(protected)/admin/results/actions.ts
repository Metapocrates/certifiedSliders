// src/app/(protected)/admin/results/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";

async function assertAdmin() {
    const supabase = await createSupabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user ?? null;
    if (!user) throw new Error("Not signed in.");

    const { data: adminRow, error } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
    if (error || !adminRow) throw new Error("Unauthorized.");

    return supabase;
}

export async function approveResultAction(formData: FormData) {
    const supabase = await assertAdmin();

    const id = Number(formData.get("id"));
    if (!id) throw new Error("Missing id.");

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

    if (error) throw new Error(error.message);

    revalidatePath("/admin/results");
    redirect("/admin/results");
}

export async function rejectResultAction(formData: FormData) {
    const supabase = await assertAdmin();

    const id = Number(formData.get("id"));
    // Persist reason (trim empty to null)
    const rawReason = (formData.get("reason") as string | null) ?? null;
    const reason =
        typeof rawReason === "string" ? rawReason.trim().slice(0, 2000) || null : null;

    if (!id) throw new Error("Missing id.");

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
        throw new Error(error.message);
    }

    revalidatePath("/admin/results");
    redirect("/admin/results");
}

export async function deleteResultAction(formData: FormData) {
    const supabase = await assertAdmin();

    const id = Number(formData.get("id"));
    if (!id) throw new Error("Missing id.");

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
        throw new Error(error.message);
    }

    if (!data || data.length === 0) {
        console.error("No result was deleted - might not exist or permission denied");
        throw new Error("Result not found or permission denied");
    }

    revalidatePath("/admin/results");
    redirect("/admin/results");
}