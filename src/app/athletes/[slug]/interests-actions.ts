"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function addInterestAction(athleteId: string, collegeName: string, slug: string) {
    const supabase = createSupabaseServer();
    const { error } = await supabase
        .from("athlete_interests")
        .insert([{ athlete_id: athleteId, college_name: collegeName }]);
    if (error) throw new Error(error.message);
    revalidatePath(`/athletes/${slug}`);
}

export async function removeInterestAction(interestId: string, slug: string) {
    const supabase = createSupabaseServer();
    const { error } = await supabase
        .from("athlete_interests")
        .delete()
        .eq("id", interestId);
    if (error) throw new Error(error.message);
    revalidatePath(`/athletes/${slug}`);
}
