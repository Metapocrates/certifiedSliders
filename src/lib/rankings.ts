import "server-only";
import { supabaseServer } from "@/utils/supabase-server";

export type RankingRow = {
    athlete_id: string;
    full_name: string;
    school_name: string | null;
    school_state: string | null;
    class_year: number | null;
    gender?: string | null;
    event?: string | null;
    mark: string | null;
    mark_seconds: number | null;
    meet_name: string | null;
    meet_date: string | null;
    proof_url: string | null;
    timing?: "FAT" | "HT" | string | null;
    wind_legal?: boolean | null;
    mark_seconds_adj?: number | null;
};

export type RankingsQuery = {
    event?: string;
    gender?: string;
    classYear?: number | null;
    state?: string;
    page?: number;
    perPage?: number;
    sort?: "time" | "time_adj" | "name" | "date";
};

export async function fetchRankings(q: RankingsQuery) {
    const page = Math.max(1, q.page ?? 1);
    const perPage = Math.min(200, Math.max(10, q.perPage ?? 50));
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const supabase = supabaseServer();

    let base = supabase.from("mv_best_event").select("*", { count: "exact" });

    const sort = q.sort ?? "time";
    switch (sort) {
        case "name":
            base = base.order("full_name", { ascending: true });
            break;
        case "date":
            base = base.order("meet_date", { ascending: false });
            break;
        case "time_adj":
            base = base.order("mark_seconds_adj", { ascending: true, nullsFirst: false });
            break;
        case "time":
        default:
            base = base.order("mark_seconds", { ascending: true, nullsFirst: false });
            break;
    }

    const { data, error, count } = await base.range(from, to);
    if (error) throw error;

    return {
        rows: (data ?? []) as RankingRow[],
        total: count ?? 0,
        page,
        perPage,
        pageCount: Math.max(1, Math.ceil((count ?? 0) / perPage)),
    };
}
