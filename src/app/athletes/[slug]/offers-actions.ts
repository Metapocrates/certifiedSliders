"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

/** Admin upsert: adds or updates an offer/interest row for a college */
export async function upsertOfferAction(
    athleteId: string,
    collegeName: string,
    offerType: "interest" | "offer"
) {
    const supabase = createSupabaseServer();
    const { error } = await supabase
        .from("college_offers")
        .upsert(
            [{ athlete_id: athleteId, college_name: collegeName, offer_type: offerType }],
            { onConflict: "athlete_id,college_slug,offer_type" }
        );
    if (error) throw new Error(error.message);
    // We don't know slug here; let the page revalidate at route-level if needed
}

/** Admin delete by composite key (college + type) for this athlete */
export async function deleteOfferByCollegeTypeAction(
    athleteId: string,
    collegeName: string,
    offerType: "interest" | "offer"
) {
    const supabase = createSupabaseServer();

    // First derive the slug server-side to match conflict target behavior
    const { data: slugRow, error: slugErr } = await supabase.rpc("to_slug", { input: collegeName } as any);
    // If you didn't expose to_slug as RPC, we can delete by case-insensitive name instead:
    // const college = collegeName.trim().toLowerCase();

    // Fallback if RPC not exposed: delete by case-insensitive name (less strict)
    if (slugErr || slugRow == null) {
        const { error } = await supabase
            .from("college_offers")
            .delete()
            .eq("athlete_id", athleteId)
            .ilike("college_name", collegeName)
            .eq("offer_type", offerType);
        if (error) throw new Error(error.message);
        return;
    }

    const collegeSlug = slugRow as unknown as string;

    const { error } = await supabase
        .from("college_offers")
        .delete()
        .eq("athlete_id", athleteId)
        .eq("offer_type", offerType)
        .eq("college_slug", collegeSlug);

    if (error) throw new Error(error.message);
    // optional: revalidatePath(`/athletes/${slug}`) if you pass slug in
}
