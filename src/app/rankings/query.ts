// src/app/rankings/query.ts
"use server";

import { createSupabaseServer } from "@/lib/supabase/compat";

// Adjust these field names if your MV differs.
type Params = {
    event: string;
    gender: "M" | "F";
    classYear: string; // empty string means "all"
    season: "indoor" | "outdoor";
    windLegal: "yes" | "all";
};

export async function getRankings(params: Params) {
    const supabase = createSupabaseServer();

    // Prefer the MV for speed. It should already flag wind-legal.
    let q = supabase
        .from("mv_best_event")
        .select(
            `
        result_id,
        athlete_id,
        event,
        gender,
        season,
        best_seconds_adj,
        best_mark_text,
        wind_legal,
        wind,
        meet_name,
        meet_date,
        proof_url,
        profiles:profiles!mv_best_event_athlete_id_fkey (full_name, username, school_name, class_year)
      `
        )
        .eq("event", params.event)
        .eq("gender", params.gender)
        .eq("season", params.season);

    if (params.windLegal === "yes") {
        q = q.eq("wind_legal", true);
    }
    if (params.classYear) {
        q = q.eq("profiles.class_year", params.classYear);
    }

    // Sort: lower adjusted seconds first for track; for fields (text), we’ll fallback to best_seconds_adj if present.
    // If your MV stores a numeric "rank" or unified metric, use that instead.
    const { data, error } = await q
        .order("best_seconds_adj", { ascending: true, nullsFirst: false })
        .limit(200);

    if (error) return { ok: false as const, error: error.message, data: [] as any[] };

    // Normalize to table’s expected keys for the renderer (keeps code simple)
    const rows = (data ?? []).map((r: any) => ({
        ...r,
        mark_seconds_adj: r.best_seconds_adj,
        mark: r.best_mark_text,
    }));
    return { ok: true as const, data: rows };
}
