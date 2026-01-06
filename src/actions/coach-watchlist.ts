"use server";

import { createSupabaseServer } from "@/lib/supabase/compat";
import { revalidatePath } from "next/cache";

export async function addToWatchlist(athleteProfileId: string) {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify user is a coach with program membership
  const { data: membership } = await supabase
    .from("program_memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { success: false, error: "Coach membership required" };
  }

  // Add to watchlist
  const { error } = await supabase.from("coach_watchlist").insert({
    coach_user_id: user.id,
    athlete_profile_id: athleteProfileId,
  });

  if (error) {
    if (error.code === "23505") {
      // Unique constraint violation - already on watchlist
      return { success: true, message: "Already on watchlist" };
    }
    console.error("Error adding to watchlist:", error);
    return { success: false, error: "Failed to add to watchlist" };
  }

  revalidatePath("/coach/portal");
  revalidatePath("/coach/portal/watchlist");
  return { success: true };
}

export async function removeFromWatchlist(watchlistId: string) {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Delete the watchlist entry (RLS will ensure ownership)
  const { error } = await supabase
    .from("coach_watchlist")
    .delete()
    .eq("id", watchlistId)
    .eq("coach_user_id", user.id);

  if (error) {
    console.error("Error removing from watchlist:", error);
    return { success: false, error: "Failed to remove from watchlist" };
  }

  revalidatePath("/coach/portal");
  revalidatePath("/coach/portal/watchlist");
  return { success: true };
}

export async function removeFromWatchlistByAthlete(athleteProfileId: string) {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Delete the watchlist entry by athlete ID
  const { error } = await supabase
    .from("coach_watchlist")
    .delete()
    .eq("coach_user_id", user.id)
    .eq("athlete_profile_id", athleteProfileId);

  if (error) {
    console.error("Error removing from watchlist:", error);
    return { success: false, error: "Failed to remove from watchlist" };
  }

  revalidatePath("/coach/portal");
  revalidatePath("/coach/portal/watchlist");
  return { success: true };
}

export async function getWatchlistIds(): Promise<Set<string>> {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from("coach_watchlist")
    .select("athlete_profile_id")
    .eq("coach_user_id", user.id);

  return new Set((data || []).map((w) => w.athlete_profile_id));
}
