import RankingsFilters from "@/components/RankingsFilters";
import RankingsTable from "@/components/RankingsTable";
import Pagination from "@/components/Pagination";
import { fetchRankings } from "@/lib/rankings";

export const revalidate = 60;
// src/app/rankings/page.tsx
export const dynamic = "force-dynamic"; // ⬅ add this

// ...rest of the file unchanged


export default async function RankingsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const event = getStr(searchParams.event) ?? "110mH";
  const gender = getStr(searchParams.gender) ?? "male";
  const classYear = toNum(searchParams.classYear);
  const state = getStr(searchParams.state) ?? undefined;
  const page = toNum(searchParams.page) ?? 1;
  const sort = (getStr(searchParams.sort) as any) ?? "time_adj";

  const { rows, total, pageCount } = await fetchRankings({ event, gender, classYear, state, page, perPage: 50, sort });
  const startRank = (page - 1) * 50 + 1;

  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Rankings</h1>
        <p className="text-sm opacity-70">
          {gender === "female" ? "Girls" : "Boys"} • {event}
          {classYear ? ` • Class of ${classYear}` : ""}
          {state ? ` • ${state}` : ""} — {total.toLocaleString()} athletes
        </p>
      </div>

      <RankingsFilters />

      <div className="card p-0">
        <RankingsTable rows={rows} startRank={startRank} />
      </div>

      <Pagination page={page} pageCount={pageCount} />

      <p className="text-xs opacity-60">* indicates wind-aided; adjusted time shown for comparison where available.</p>
    </div>
  );
}

function getStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v ?? undefined;
}

function toNum(v: string | string[] | undefined): number | undefined {
  const s = getStr(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
