// Path: src/app/(protected)/admin/ratings/actions.ts
// (or src/app/admin/ratings/actions.ts — match your page.tsx location)
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

type Gender = "M" | "F" | "U";
type Star = 3 | 4 | 5;

type StandardRow = { event: string; class_year: number; gender: Gender };
type EligibleRow = {
    athlete_id: string;
    username: string;
    full_name: string | null;
    mark_seconds_adj: number | null;
    mark_metric: number | null;
};

/** Load available events/classYears/genders from rating_standards */
export async function getStandardsMetaAction() {
    const supabase = createSupabaseServer();
    const { data, error } = await supabase
        .from("rating_standards")
        .select("event, class_year, gender")
        .order("event", { ascending: true });

    if (error) return { ok: false as const, error: error.message };

    const rows = (data ?? []) as StandardRow[];

    const events = Array.from(new Set(rows.map((r) => r.event)));
    const classYears = Array.from(new Set(rows.map((r) => r.class_year))).sort((a, b) => a - b);
    const genders = Array.from(new Set(rows.map((r) => r.gender)));

    return { ok: true as const, events, classYears, genders };
}

/** List athletes who meet the selected cutoff using the eligible_athletes RPC */
export async function getEligibleAthletesAction(params: {
    event: string;
    classYear: number;
    gender: Gender;
    star: Star;
}) {
    const supabase = createSupabaseServer();

    // Admin gate
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return { ok: false as const, error: "Not signed in." };

    const { data: adminRow } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
    if (!adminRow) return { ok: false as const, error: "Admins only." };

    const { data, error } = await supabase.rpc("eligible_athletes", {
        p_event: params.event,
        p_class_year: params.classYear,
        p_gender: params.gender,
        p_star: params.star,
    });

    if (error) return { ok: false as const, error: error.message };

    const rows = (data ?? []) as EligibleRow[];

    return {
        ok: true as const,
        athletes: rows.map((r) => ({
            id: r.athlete_id,
            username: r.username,
            fullName: r.full_name,
            markSecondsAdj: r.mark_seconds_adj,
            markMetric: r.mark_metric,
        })),
    };
}

/** Save the chosen star rating for a username; logs history via trigger + optional note insert */
export async function setStarRatingAction(formData: FormData) {
    const supabase = createSupabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return { ok: false as const, error: "Not signed in." };

    const { data: adminRow, error: adminErr } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
    if (adminErr) return { ok: false as const, error: `Admin check failed: ${adminErr.message}` };
    if (!adminRow) return { ok: false as const, error: "You must be an admin to set ratings." };

    const username = String(formData.get("username") || "").trim();
    const ratingStr = String(formData.get("rating") || "").trim();
    const note = (formData.get("note") ? String(formData.get("note")) : "").trim();

    if (!username) return { ok: false as const, error: "Username is required." };
    if (!ratingStr) return { ok: false as const, error: "Rating is required." };

    const newRating = Number(ratingStr);
    if (![3, 4, 5].includes(newRating)) return { ok: false as const, error: "Rating must be 3, 4, or 5." };

    const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("id, username, full_name, star_rating")
        .eq("username", username)
        .single();
    if (profErr) return { ok: false as const, error: `Athlete not found: ${profErr.message}` };

    const oldRating = profile.star_rating ?? null;

    const { data: updated, error: updErr } = await supabase
        .from("profiles")
        .update({ star_rating: newRating })
        .eq("id", profile.id)
        .select("id, username, star_rating")
        .single();
    if (updErr) return { ok: false as const, error: `Update failed: ${updErr.message}` };

    if (note) {
        const { error: noteErr } = await supabase
            .from("ratings_history")
            .insert({
                athlete_id: profile.id,
                old_rating: oldRating,
                new_rating: newRating,
                updated_by: auth.user.id,
                note,
            });
        if (noteErr) console.warn("ratings_history note insert failed:", noteErr);
    }

    revalidatePath(`/athletes/${profile.username}`);
    revalidatePath(`/rankings`);
    revalidatePath(`/`);

    return {
        ok: true as const,
        username: updated.username,
        fullName: profile.full_name ?? null,
        oldRating,
        newRating: updated.star_rating,
    };
}
