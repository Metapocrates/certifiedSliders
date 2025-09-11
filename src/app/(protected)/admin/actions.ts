"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";

async function assertIsAdmin(userId: string) {
    const supabase = createSupabaseServer();
    const { data, error } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
    if (error || !data) {
        throw new Error("Admin access required.");
    }
}

export async function verifyResultAction(formData: FormData) {
    const user = await getSessionUser();
    if (!user) throw new Error("Not signed in.");
    await assertIsAdmin(user.id);

    const resultIdRaw = formData.get("resultId");
    const decision = formData.get("decision"); // "verify" | "reject"

    const resultId = Number(resultIdRaw);
    if (!Number.isFinite(resultId)) throw new Error("Invalid result id.");
    const verified = decision === "verify";

    const supabase = createSupabaseServer();
    const { error } = await supabase.rpc("verify_result", {
        p_result_id: resultId,
        p_verified: verified,
        p_admin: user.id,
    });

    if (error) throw error;

    // Best effort cache bust
    revalidatePath("/rankings");
    // You can also revalidate athlete pages if you want, but we’d need athlete_id.
    return { ok: true };
}
