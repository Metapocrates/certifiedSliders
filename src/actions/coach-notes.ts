"use server";

import { createSupabaseServer } from "@/lib/supabase/compat";
import { revalidatePath } from "next/cache";

export async function getNotesForAthlete(athleteProfileId: string) {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated", notes: [] };
  }

  const { data: notes, error } = await supabase
    .from("coach_notes")
    .select("*")
    .eq("coach_user_id", user.id)
    .eq("athlete_profile_id", athleteProfileId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notes:", error);
    return { success: false, error: "Failed to fetch notes", notes: [] };
  }

  return { success: true, notes: notes || [] };
}

export async function addNote(athleteProfileId: string, noteText: string) {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify user is a coach
  const { data: membership } = await supabase
    .from("program_memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { success: false, error: "Coach membership required" };
  }

  const { data, error } = await supabase
    .from("coach_notes")
    .insert({
      coach_user_id: user.id,
      athlete_profile_id: athleteProfileId,
      note: noteText.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding note:", error);
    return { success: false, error: "Failed to add note" };
  }

  revalidatePath("/coach/portal");
  return { success: true, note: data };
}

export async function updateNote(noteId: string, noteText: string) {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("coach_notes")
    .update({ note: noteText.trim() })
    .eq("id", noteId)
    .eq("coach_user_id", user.id); // RLS + extra safety

  if (error) {
    console.error("Error updating note:", error);
    return { success: false, error: "Failed to update note" };
  }

  revalidatePath("/coach/portal");
  return { success: true };
}

export async function deleteNote(noteId: string) {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("coach_notes")
    .delete()
    .eq("id", noteId)
    .eq("coach_user_id", user.id);

  if (error) {
    console.error("Error deleting note:", error);
    return { success: false, error: "Failed to delete note" };
  }

  revalidatePath("/coach/portal");
  return { success: true };
}

export async function getNotesCountForAthletes(athleteProfileIds: string[]) {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Map<string, number>();

  const { data } = await supabase
    .from("coach_notes")
    .select("athlete_profile_id")
    .eq("coach_user_id", user.id)
    .in("athlete_profile_id", athleteProfileIds);

  // Count notes per athlete
  const counts = new Map<string, number>();
  (data || []).forEach((note) => {
    const current = counts.get(note.athlete_profile_id) || 0;
    counts.set(note.athlete_profile_id, current + 1);
  });

  return counts;
}
