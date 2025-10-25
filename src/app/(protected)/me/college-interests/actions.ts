"use server";

import { createSupabaseServer } from "@/lib/supabase/compat";
import { revalidatePath } from "next/cache";

async function getCurrentUser() {
  const supabase = createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;
  return { supabase, user };
}

async function revalidateProfilePaths(supabase: ReturnType<typeof createSupabaseServer>) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  revalidatePath("/me");
  if (profile?.username) {
    revalidatePath(`/athletes/${profile.username}`);
  }
}

export async function addCollegeInterest(collegeName: string) {
  const trimmed = collegeName.trim();
  if (!trimmed) {
    return { ok: false, message: "College name required." };
  }
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { data, error } = await supabase
    .from("athlete_college_interests")
    .insert({ athlete_id: user.id, college_name: trimmed })
    .select("id, college_name, created_at")
    .single();

  if (error) {
    if ((error as any)?.code === "23505") {
      return { ok: false, message: "That college is already on your list." };
    }
    return { ok: false, message: error.message };
  }

  await revalidateProfilePaths(supabase);
  return {
    ok: true,
    entry: data
      ? { id: data.id, collegeName: data.college_name, createdAt: data.created_at }
      : null,
  };
}

export async function removeCollegeInterest(id: string) {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { error } = await supabase
    .from("athlete_college_interests")
    .delete()
    .eq("id", id)
    .eq("athlete_id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  await revalidateProfilePaths(supabase);
  return { ok: true };
}
