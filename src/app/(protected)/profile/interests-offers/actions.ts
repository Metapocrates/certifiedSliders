"use server";

import { createSupabaseServer } from "@/lib/supabase/compat";
import { revalidatePath } from "next/cache";

// Athlete: add/remove interest
export async function addAthleteInterestAction(collegeName: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("athlete_interests")
    .insert([{ college_name: collegeName }])
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/me"); // adjust if your profile route differs
  return data;
}

export async function removeAthleteInterestAction(id: string) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("athlete_interests")
    .delete()
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/me");
}

// Admin: add/update/remove offers
export async function upsertCollegeOfferAction(
  athleteId: string,
  collegeName: string,
  offerType: "interest" | "offer"
) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("college_offers")
    .upsert(
      [{ athlete_id: athleteId, college_name: collegeName, offer_type: offerType }],
      { onConflict: "athlete_id,college_slug,offer_type" }
    )
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/athlete/${athleteId}`);
  return data;
}

export async function deleteCollegeOfferAction(id: string) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("college_offers")
    .delete()
    .eq("id", id);
  if (error) throw error;
  // no hard-coded path; caller decides if revalidate needed
}
