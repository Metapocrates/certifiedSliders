"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) throw new Error("Not an admin");
  return { supabase, user };
}

export async function resolveDuplicateAction(
  id: string,
  status: "merged" | "dismissed" | "distinct",
  notes?: string
) {
  const { supabase, user } = await requireAdmin();

  const { error } = await supabase
    .from("athlete_duplicate_candidates")
    .update({
      status,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      notes: notes || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/duplicates");
}

export async function addDuplicateCandidateAction(
  profileIdA: string,
  profileIdB: string,
  confidence: number,
  matchMethod: string,
  notes?: string
) {
  const { supabase } = await requireAdmin();

  // Ensure consistent ordering (smaller UUID first)
  const [a, b] = profileIdA < profileIdB
    ? [profileIdA, profileIdB]
    : [profileIdB, profileIdA];

  const { error } = await supabase
    .from("athlete_duplicate_candidates")
    .insert({
      profile_id_a: a,
      profile_id_b: b,
      confidence,
      match_method: matchMethod,
      notes: notes || null,
    });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/duplicates");
}
