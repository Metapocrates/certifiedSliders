export const dynamic = "force-dynamic";
export const revalidate = 60;

import RankingsFilters from "@/components/RankingsFilters";
import RankingsTable from "@/components/RankingsTable";
import Pagination from "@/components/Pagination";
import { fetchRankings } from "@/lib/rankings";
import { parseRankingsQuery } from "@/lib/params";

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const q = parseRankingsQuery(searchParams);
  const {
    event = "110mH",
    gender = "male",
    classYear,
    state,
    page,
    perPage,
    sort,
  } = q;

  try {
    const { rows, total, pageCount } = await fetchRankings({
      event,
      gender,
      classYear,
      state,
      page,
      perPage,
      sort,
    });

    const startRank = (page - 1) * perPage + 1;
    const genderLabel = gender === "female" ? "Girls" : "Boys";

    return (
      <div className="container max-w-6xl mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Rankings</h1>
          <p className="text-sm opacity-70">
            {genderLabel} • {event}
            {classYear ? ` • Class of ${classYear}` : ""}
            {state ? ` • ${state}` : ""} — {(total ?? 0).toLocaleString()} athletes
          </p>
        </div>

        <RankingsFilters />

        <div className="card p-0">
          <RankingsTable rows={rows} startRank={startRank} />
        </div>

        <Pagination page={page} pageCount={pageCount} />

        <p className="text-xs opacity-60">
          * indicates wind-aided; adjusted time shown for comparison where available.
        </p>
      </div>
    );
  } catch {
    return (
      <div className="container max-w-3xl mx-auto p-6 space-y-3">
        <h1 className="text-xl font-semibold">Rankings</h1>
        <p className="subtle">Something went wrong loading rankings.</p>
      </div>
    );
  }
}
