// src/app/(protected)/admin/ratings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

type Gender = "M" | "F" | "U";
type Star = 3 | 4 | 5;
type Grade = 9 | 10 | 11 | 12;

type StandardsGradeRow = { event: string; gender: Gender };
type YearRow = { class_year: number | null };

type EligibleRPCRow = {
    athlete_id: string;
    username: string;
    full_name: string | null;
    best_time: number | null;
    best_mark: number | null;
    eligible_star: number | null;
};

export async function getStandardsMetaAction() {
    const supabase = createSupabaseServer();

    const { data: std, error: stdErr } = await supabase
        .from("rating_standards_grade")
        .select("event, gender")
        .order("event", { ascending: true });

    if (stdErr) return { ok: false as const, error: stdErr.message };

    const stdRows = (std ?? []) as StandardsGradeRow[];

    const events = Array.from(new Set(stdRows.map((r) => r.event)));
    const genders = Array.from(new Set(stdRows.map((r) => r.gender))) as Gender[];

    const { data: years, error: yrErr } = await supabase
        .from("profiles")
        .select("class_year")
        .not("class_year", "is", null);

    if (yrErr) return { ok: false as const, error: yrErr.message };

    const yearRows = (years ?? []) as YearRow[];
    const classYears = Array.from(
        new Set(
            yearRows
                .map((r) => (r.class_year == null ? null : Number(r.class_year)))
                .filter((n): n is number => Number.isFinite(n))
        )
    ).sort((a, b) => a - b);

    const grades: Grade[] = [9, 10, 11, 12];

    return { ok: true as const, events, genders, classYears, grades };
}

export async function getEligibleAthletesByGradeAction(params: {
    event: string;
    grade: Grade;
    classYear: number;
    gender: Gender;
}) {
    const supabase = createSupabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return { ok: false as const, error: "Not signed in." };

    const { data: adminRow } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
    if (!adminRow) return { ok: false as const, error: "Admins only." };

    const { data, error } = await supabase.rpc("eligible_athletes_by_grade", {
        p_event: params.event,
        p_grade: params.grade,
        p_class_year: params.classYear,
        p_gender: params.gender,
    });

    if (error) return { ok: false as const, error: error.message };

    const rows = (data ?? []) as EligibleRPCRow[];

    return {
        ok: true as const,
        athletes: rows.map((r) => ({
            id: r.athlete_id,
            username: r.username,
            fullName: r.full_name,
            eligibleStar: r.eligible_star ?? 0,
        })),
    };
}

// ---------- Helper: resilient history insert ----------
async function insertRatingHistory(
    supabase: ReturnType<typeof createSupabaseServer>,
    baseRecord: Record<string, unknown>,
    note?: string
) {
    // Avoid TS friction with dynamic table names
    const fromAny = (tbl: string) => (supabase as any).from(tbl);

    // Try both table names, first with note (if given), then without.
    const attempts: Array<{ table: string; withNote: boolean }> = [
        { table: "ratings_history", withNote: !!note },
        { table: "ratings_history", withNote: false },
        { table: "rating_history", withNote: !!note },
        { table: "rating_history", withNote: false },
    ];

    for (const a of attempts) {
        const payload = a.withNote ? { ...baseRecord, note } : baseRecord;
        const { error } = await fromAny(a.table).insert(payload);
        if (!error) return { ok: true as const, table: a.table, withNote: a.withNote };
        // If it's a permissions or other hard error, keep going but log it
        console.warn(`[ratings] history insert attempt failed (${a.table}, withNote=${a.withNote}):`, error?.message);
    }
    return { ok: false as const };
}

/** Server-side guard: cannot assign > eligibleStar for the selected (event,grade,classYear). */
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
    const event = String(formData.get("event") || "").trim();
    const gradeStr = String(formData.get("grade") || "").trim();
    const classYearStr = String(formData.get("classYear") || "").trim();
    const gender = (String(formData.get("gender") || "U").trim() as Gender);
    const noteRaw = formData.get("note");
    const note = typeof noteRaw === "string" ? noteRaw.trim() : "";

    if (!username || !ratingStr || !event || !gradeStr || !classYearStr) {
        return { ok: false as const, error: "Missing required fields." };
    }

    const newRating = Number(ratingStr) as Star;
    const grade = Number(gradeStr) as Grade;
    const classYear = Number(classYearStr);

    if (![3, 4, 5].includes(newRating)) return { ok: false as const, error: "Rating must be 3, 4, or 5." };
    if (![9, 10, 11, 12].includes(grade)) return { ok: false as const, error: "Bad grade." };

    const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("id, username, full_name, star_rating, class_year, gender")
        .eq("username", username)
        .single();
    if (profErr) return { ok: false as const, error: `Athlete not found: ${profErr.message}` };

    const { data: eligibleRows, error: eligErr } = await supabase.rpc("eligible_athletes_by_grade", {
        p_event: event,
        p_grade: grade,
        p_class_year: classYear,
        p_gender: gender,
    });
    if (eligErr) return { ok: false as const, error: `Eligibility check failed: ${eligErr.message}` };

    const rows = (eligibleRows ?? []) as EligibleRPCRow[];
    const row = rows.find((r) => r.athlete_id === profile.id);
    const eligibleStar = row?.eligible_star ?? 0;

    if (eligibleStar < newRating) {
        return {
            ok: false as const,
            error: `This athlete is only eligible up to ${eligibleStar || 0}★ for the selected grade/event.`,
        };
    }

    const { data: updated, error: updErr } = await supabase
        .from("profiles")
        .update({ star_rating: newRating })
        .eq("id", profile.id)
        .select("id, username, star_rating")
        .single();
    if (updErr) return { ok: false as const, error: `Update failed: ${updErr.message}` };

    // Optional history (non-blocking). Works whether your table is `ratings_history` or `rating_history`, with or without a `note` column.
    const baseHistory = {
        athlete_id: profile.id,
        old_rating: profile.star_rating ?? null,
        new_rating: newRating,
        updated_by: auth.user.id,
    } as Record<string, unknown>;

    if (note) {
        const res = await insertRatingHistory(supabase, baseHistory, note);
        if (!res.ok) console.warn("[ratings] all history insert attempts failed (note).");
    } else {
        const res = await insertRatingHistory(supabase, baseHistory);
        if (!res.ok) console.warn("[ratings] all history insert attempts failed (no note).");
    }

    revalidatePath(`/athletes/${profile.username}`);
    revalidatePath(`/rankings`);
    revalidatePath(`/`);

    return {
        ok: true as const,
        username: updated.username as string,
        fullName: (profile.full_name ?? null) as string | null,
        oldRating: (profile.star_rating ?? null) as number | null,
        newRating: updated.star_rating as number,
    };
}
