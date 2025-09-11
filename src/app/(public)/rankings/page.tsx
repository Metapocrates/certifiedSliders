import { Suspense } from "react";
import { createSupabaseServer } from "@/lib/supabase/compat";
import RankingsFilters from "@/components/RankingsFilters";
import RankingsTable from "@/components/RankingsTable";
import type { RankingsRow } from "@/components/RankingsTable";

export const revalidate = 60;

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

  // 1) Pull rows from MV (only columns that exist there)
  let query = supabase
    .from("mv_best_event")
    .select(`
      athlete_id,
      event,
      mark,
      mark_seconds,
      mark_seconds_adj,
      wind,
      season,
      meet_name,
      meet_date,
      proof_url
    `);

  if (params.event) query = query.eq("event", params.event);
  if (params.gender && (params.gender === "M" || params.gender === "F")) {
    // We'll filter gender after we fetch profiles (MV has no gender column)
  }
  const cy = coerceClassYear(params.classYear);
  // Same: we'll filter classYear after we fetch profiles.

  query = query.order("mark_seconds_adj", { ascending: true, nullsFirst: false }).limit(200);

  const { data: mvRows, error: mvErr } = await query;
  if (mvErr) throw mvErr;

  const rows = mvRows ?? [];
  if (!rows.length) return [];

  // 2) Fetch profiles for athlete metadata
  const athleteIds = Array.from(new Set(rows.map(r => r.athlete_id as string)));
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, full_name, class_year, gender, school_name, school_state")
    .in("id", athleteIds);
  if (profErr) throw profErr;

  const pmap = new Map((profiles ?? []).map(p => [p.id, p]));

  // 3) Merge + apply gender/class filters now that we have profile data
  let merged: RankingsRow[] = rows.map((r) => {
    const p = pmap.get(r.athlete_id as string);
    return {
      athlete_id: r.athlete_id as string,
      full_name: (p?.full_name ?? "—") as string,
      class_year: (p?.class_year ?? null) as number | null,
      gender: (p?.gender ?? "—") as "M" | "F" | string,
      school_name: (p?.school_name ?? "—") as string,
      school_state: (p?.school_state ?? "") as string,
      event: r.event as string,
      mark: (r.mark ?? null) as string | null,
      mark_seconds: (r.mark_seconds ?? null) as number | null,
      mark_seconds_adj: (r.mark_seconds_adj ?? null) as number | null,
      wind: (r.wind ?? null) as number | null,
      season: (r.season ?? null) as string | null,
      meet_name: (r.meet_name ?? null) as string | null,
      meet_date: (r.meet_date ?? null) as string | null,
      proof_url: (r.proof_url ?? null) as string | null,
    };
  });

  if (params.gender === "M" || params.gender === "F") {
    merged = merged.filter(r => r.gender === params.gender);
  }
  if (cy) {
    merged = merged.filter(r => r.class_year === cy);
  }

  return merged;
}

export default async function RankingsPage({ searchParams }: { searchParams: SearchParams }) {
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
