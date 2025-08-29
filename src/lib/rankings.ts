import "server-only";
import { supabaseServer } from "@/utils/supabase-server";

export type RankingRow = {
    athlete_id: string;
    full_name: string;
    school_name: string | null;
    school_state: string | null;
    class_year: number | null;
    gender: "male" | "female" | string;
    event: string;
    mark: string | null;
    mark_seconds: number | null;
    mark_seconds_adj: number | null;
    wind_legal: boolean | null;
    timing: "FAT" | "HT" | string | null;
    meet_name: string | null;
    meet_date: string | null;
    proof_url: string | null;
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

    let query = supabase
        .from("mv_best_event")
        .select(
            [
                "athlete_id",
                "full_name",
                "school_name",
                "school_state",
                "class_year",
                "gender",
                "event",
                "mark",
                "mark_seconds",
                "mark_seconds_adj",
                "wind_legal",
                "timing",
                "meet_name",
                "meet_date",
                "proof_url"
            ].join(","),
            { count: "exact" }
        );

    if (q.event) query = query.eq("event", q.event);
    if (q.gender) query = query.eq("gender", q.gender);
    if (q.classYear) query = query.eq("class_year", q.classYear);
    if (q.state) query = query.eq("school_state", q.state);

    switch (q.sort) {
        case "name":
            query = query.order("full_name", { ascending: true });
            break;
        case "date":
            query = query.order("meet_date", { ascending: false });
            break;
        case "time_adj":
            query = query.order("mark_seconds_adj", { ascending: true, nullsFirst: false });
            break;
        case "time":
        default:
            query = query.order("mark_seconds", { ascending: true, nullsFirst: false });
            break;
    }

    const { data, error, count } = await query.returns<RankingRow[]>().range(from, to);
    if (error) throw error;

    return {
        rows: data ?? [],
        total: count ?? 0,
        page,
        perPage,
        pageCount: Math.max(1, Math.ceil((count ?? 0) / perPage))
    };
}
