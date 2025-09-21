"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function moderateResultAction(formData: FormData) {
    const resultId = String(formData.get("resultId") || "");
    const decision = String(formData.get("decision") || ""); // "approve" | "reject"
    const username = String(formData.get("username") || "");

    if (!resultId) return { ok: false as const, error: "Missing resultId" };
    if (!["approve", "reject"].includes(decision)) {
        return { ok: false as const, error: "Invalid decision" };
    }

    const supabase = createSupabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return { ok: false as const, error: "Unauthorized" };

    const { data: adminRow, error: adminErr } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (adminErr) return { ok: false as const, error: adminErr.message };
    if (!adminRow) return { ok: false as const, error: "Admins only." };

    const newStatus = decision === "approve" ? "verified" : "rejected";

    const { error } = await supabase
        .from("results")
        .update({ status: newStatus })
        .eq("id", resultId);

    if (error) return { ok: false as const, error: error.message };

    // Revalidate the history page and rankings
    if (username) revalidatePath(`/athletes/${username}/history`);
    revalidatePath(`/rankings`);

    return { ok: true as const };
}
