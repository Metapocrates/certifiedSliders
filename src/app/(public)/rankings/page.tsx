import { Suspense } from "react";
import { createSupabaseServer } from "@/lib/supabase/compat";
import RankingsFilters from "@/components/RankingsFilters";
import RankingsTable from "@/components/RankingsTable";
import type { RankingsRow } from "@/components/RankingsTable";

export const revalidate = 60; // cache briefly to keep page snappy

type SearchParams = {
  event?: string;
  gender?: "M" | "F" | string;
  classYear?: string;
};

function coerceClassYear(value?: string): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchRankings(params: SearchParams): Promise<RankingsRow[]> {
  const supabase = createSupabaseServer();

  let query = supabase
    .from("mv_best_event")
    .select(
      `
      athlete_id,
      full_name,
      class_year,
      gender,
      school_name,
      school_state,
      event,
      mark,
      mark_seconds,
      mark_seconds_adj,
      wind,
      season,
      meet_name,
      meet_date,
      proof_url
    `
    );

  if (params.event) query = query.eq("event", params.event);
  if (params.gender && (params.gender === "M" || params.gender === "F")) {
    query = query.eq("gender", params.gender);
  }
  const cy = coerceClassYear(params.classYear);
  if (cy) query = query.eq("class_year", cy);

  // Order fastest → slowest for time-based events (lower mark_seconds_adj first), but
  // still reasonable for measured events (we’ll sort by mark_seconds_adj if present).
  query = query.order("mark_seconds_adj", { ascending: true, nullsFirst: false }).limit(200);

  const { data, error } = await query;
  if (error) throw error;

  // Normalize rows defensively
  return (data || []).map((r) => ({
    athlete_id: r.athlete_id as string,
    full_name: (r.full_name ?? "—") as string,
    class_year: r.class_year as number | null,
    gender: (r.gender ?? "—") as "M" | "F" | string,
    school_name: (r.school_name ?? "—") as string,
    school_state: (r.school_state ?? "") as string,
    event: r.event as string,
    mark: (r.mark ?? null) as string | null,
    mark_seconds: (r.mark_seconds ?? null) as number | null,
    mark_seconds_adj: (r.mark_seconds_adj ?? null) as number | null,
    wind: (r.wind ?? null) as number | null,
    season: (r.season ?? null) as string | null,
    meet_name: (r.meet_name ?? null) as string | null,
    meet_date: (r.meet_date ?? null) as string | null,
    proof_url: (r.proof_url ?? null) as string | null,
  }));
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const initialParams = {
    event: searchParams.event ?? "",
    gender: searchParams.gender ?? "",
    classYear: searchParams.classYear ?? "",
  };

  const rows = await fetchRankings(searchParams);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Rankings</h1>
      <RankingsFilters initial={initialParams} />
      <div className="mt-6">
        <Suspense fallback={<div className="text-sm subtle">Loading rankings…</div>}>
          <RankingsTable rows={rows} />
        </Suspense>
      </div>
    </div>
  );
}
