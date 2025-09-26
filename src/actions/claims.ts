"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

async function isAdminUser() {
    const supabase = createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    return !!data;
}

export async function requestClaimAction(athleteId: string, slug: string) {
    const supabase = createSupabaseServer();
    const {
        data: { user },
        error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) throw new Error("Not signed in");

    const { error } = await supabase
        .from("athlete_claims")
        .insert([{ athlete_id: athleteId, user_id: user.id, status: "pending" }]);
    if (error) throw new Error(error.message);

    await supabase.from("athletes").update({ claim_status: "pending" }).eq("id", athleteId);
    revalidatePath(`/athletes/${slug}`);
}

export async function cancelMyClaimAction(claimId: string, slug: string) {
    const supabase = createSupabaseServer();
    const { error } = await supabase.from("athlete_claims").update({ status: "canceled" }).eq("id", claimId);
    if (error) throw new Error(error.message);
    revalidatePath(`/athletes/${slug}`);
}

export async function adminApproveClaimAction(claimId: string, slug: string) {
    const supabase = createSupabaseServer();
    if (!(await isAdminUser())) throw new Error("Not authorized");

    const { data: claim, error: claimErr } = await supabase
        .from("athlete_claims")
        .select("id, athlete_id, user_id, status")
        .eq("id", claimId)
        .single();
    if (claimErr) throw new Error(claimErr.message);
    if (claim.status !== "pending") throw new Error("Claim is not pending");

    const { error: updClaimErr } = await supabase
        .from("athlete_claims")
        .update({ status: "approved" })
        .eq("id", claimId);
    if (updClaimErr) throw new Error(updClaimErr.message);

    const { error: updAthErr } = await supabase
        .from("athletes")
        .update({ claimed_user_id: claim.user_id, claim_status: "verified", is_claimed: true })
        .eq("id", claim.athlete_id);
    if (updAthErr) throw new Error(updAthErr.message);

    await supabase
        .from("athlete_claims")
        .update({ status: "denied" })
        .eq("athlete_id", claim.athlete_id)
        .eq("status", "pending");

    revalidatePath(`/athletes/${slug}`);
}

export async function adminDenyClaimAction(claimId: string, slug: string) {
    const supabase = createSupabaseServer();
    if (!(await isAdminUser())) throw new Error("Not authorized");
    const { error } = await supabase.from("athlete_claims").update({ status: "denied" }).eq("id", claimId);
    if (error) throw new Error(error.message);
    revalidatePath(`/athletes/${slug}`);
}
