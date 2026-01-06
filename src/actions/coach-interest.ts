"use server";

import { createSupabaseServer } from "@/lib/supabase/compat";
import { revalidatePath } from "next/cache";

export async function expressInterest(
  athleteProfileId: string,
  programId: string,
  message?: string
) {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify user has membership in the program
  const { data: membership } = await supabase
    .from("program_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { success: false, error: "You are not a member of this program" };
  }

  // Create interest record
  const { data, error } = await supabase
    .from("coach_interest")
    .insert({
      coach_user_id: user.id,
      program_id: programId,
      athlete_profile_id: athleteProfileId,
      status: "expressed",
      message: message?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      // Unique constraint - already expressed interest
      return { success: false, error: "You have already expressed interest in this athlete" };
    }
    console.error("Error expressing interest:", error);
    return { success: false, error: "Failed to express interest" };
  }

  revalidatePath("/coach/portal");
  return { success: true, interest: data };
}

export async function withdrawInterest(athleteProfileId: string) {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Update status to withdrawn
  const { error } = await supabase
    .from("coach_interest")
    .update({ status: "withdrawn" })
    .eq("coach_user_id", user.id)
    .eq("athlete_profile_id", athleteProfileId);

  if (error) {
    console.error("Error withdrawing interest:", error);
    return { success: false, error: "Failed to withdraw interest" };
  }

  revalidatePath("/coach/portal");
  return { success: true };
}

export async function getInterestStatusForAthletes(
  athleteProfileIds: string[]
): Promise<Map<string, { status: string; message?: string }>> {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Map();

  const { data } = await supabase
    .from("coach_interest")
    .select("athlete_profile_id, status, message")
    .eq("coach_user_id", user.id)
    .in("athlete_profile_id", athleteProfileIds);

  const statusMap = new Map<string, { status: string; message?: string }>();
  (data || []).forEach((interest) => {
    statusMap.set(interest.athlete_profile_id, {
      status: interest.status,
      message: interest.message || undefined,
    });
  });

  return statusMap;
}
