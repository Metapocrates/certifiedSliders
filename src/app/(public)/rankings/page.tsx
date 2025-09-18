import { Suspense } from "react";
import { createSupabaseServer } from "@/lib/supabase/compat";
import RankingsFilters from "@/components/RankingsFilters";
import RankingsTable from "@/components/RankingsTable";
import type { RankingsRow } from "@/components/RankingsTable";

export const revalidate = 60;

/** Minimal shapes used on this page to avoid implicit-any in callbacks */
type RankingRow = {
  athlete_id: string;
  event?: string | null;
  mark?: string | null;
  mark_seconds?: number | null;
  mark_seconds_adj?: number | null;
  wind?: number | string | null;
  season?: string | null;
  meet_name?: string | null;
  meet_date?: string | null;
  proof_url?: string | null;
  [key: string]: unknown;
};

type ProfileLite = {
  id: string;
  username: string | null;             // ⬅️ added
  full_name: string | null;
  class_year: number | null;
  gender: "M" | "F" | string | null;
  school_name: string | null;
  school_state: string | null;
  star_rating: number | null;          // ⬅️ added earlier
};

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
  // gender & classYear filtered after profiles fetch
  const cy = coerceClassYear(params.classYear);

  query = query
    .order("mark_seconds_adj", { ascending: true, nullsFirst: false })
    .limit(200);

  const { data: mvRows, error: mvErr } = await query;
  if (mvErr) throw mvErr;

  const rows: RankingRow[] = (mvRows ?? []) as unknown as RankingRow[];
  if (!rows.length) return [];

  // 2) Fetch profiles for athlete metadata (now includes username + star_rating)
  const athleteIds = Array.from(
    new Set(rows.map((r: RankingRow) => r.athlete_id as string))
  );

  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, class_year, gender, school_name, school_state, star_rating" // ⬅️ added username
    )
    .in("id", athleteIds);

  if (profErr) throw profErr;

  const profileArray: ProfileLite[] =
    (profiles ?? []) as unknown as ProfileLite[];
  const pmap = new Map<string, ProfileLite>(
    profileArray.map((p: ProfileLite) => [p.id, p])
  );

  // 3) Merge + apply gender/class filters now that we have profile data
  let merged: RankingsRow[] = rows.map((r: RankingRow) => {
    const p = pmap.get(r.athlete_id);
    const obj = {
      athlete_id: r.athlete_id,
      username: (p?.username ?? "unknown") as string,     // ⬅️ added
      full_name: (p?.full_name ?? "—") as string,
      class_year: (p?.class_year ?? null) as number | null,
      gender: (p?.gender ?? "—") as "M" | "F" | string,
      school_name: (p?.school_name ?? "—") as string,
      school_state: (p?.school_state ?? "") as string,
      event: (r.event ?? "") as string,
      mark: (r.mark ?? null) as string | null,
      mark_seconds: (r.mark_seconds ?? null) as number | null,
      mark_seconds_adj: (r.mark_seconds_adj ?? null) as number | null,
      wind: (r.wind ?? null) as number | null,
      season: (r.season ?? null) as string | null,
      meet_name: (r.meet_name ?? null) as string | null,
      meet_date: (r.meet_date ?? null) as string | null,
      proof_url: (r.proof_url ?? null) as string | null,
      star_rating: (p?.star_rating ?? 0) as number | null, // ⬅️ added
    };
    return obj as unknown as RankingsRow;
  });

  if (params.gender === "M" || params.gender === "F") {
    merged = merged.filter((r: RankingsRow) => r.gender === params.gender);
  }
  if (cy) {
    merged = merged.filter((r: RankingsRow) => r.class_year === cy);
  }

  return merged;
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
        <Suspense
          fallback={<div className="text-sm subtle">Loading rankings…</div>}
        >
          <RankingsTable rows={rows} />
        </Suspense>
      </div>
    </div>
  );
}
