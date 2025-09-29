// src/app/rankings/page.tsx
// Server component — public
import Link from "next/link";
import { getRankings } from "./query";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams?: {
    event?: string;
    gender?: "M" | "F";
    class_year?: string; // "2028", etc.
    season?: "indoor" | "outdoor";
    wind_legal?: "yes" | "all";
  };
};

const EVENTS = [
  "100","200","400","800","1600","3200",
  "110H","100H","300H","400H","LJ","TJ","HJ","PV","SP","DT","JT","HT"
];

export default async function RankingsPage({ searchParams }: Props) {
  const event = searchParams?.event ?? "110H";
  const gender = searchParams?.gender ?? "M";
  const classYear = searchParams?.class_year ?? "";
  const season = searchParams?.season ?? "outdoor";
  const windLegal = searchParams?.wind_legal ?? "yes";

  const { ok, data, error } = await getRankings({ event, gender, classYear, season, windLegal });
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-semibold mb-3">Rankings</h1>
      <form className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <select name="event" defaultValue={event} className="rounded-md border px-3 py-2">
          {EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select name="gender" defaultValue={gender} className="rounded-md border px-3 py-2">
          <option value="M">Boys</option>
          <option value="F">Girls</option>
        </select>
        <input
          name="class_year"
          defaultValue={classYear}
          placeholder="Class (e.g., 2028)"
          className="rounded-md border px-3 py-2"
        />
        <select name="season" defaultValue={season} className="rounded-md border px-3 py-2">
          <option value="outdoor">Outdoor</option>
          <option value="indoor">Indoor</option>
        </select>
        <select name="wind_legal" defaultValue={windLegal} className="rounded-md border px-3 py-2">
          <option value="yes">Wind-legal only</option>
          <option value="all">All marks</option>
        </select>
        <button className="md:col-span-1 col-span-2 rounded-md bg-black text-white px-3 py-2">
          Apply
        </button>
      </form>

      {!ok ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-700">
          {error ?? "Unable to load rankings."}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-md border px-3 py-2">No results.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Athlete</th>
                <th className="px-3 py-2 text-left font-medium">School / Class</th>
                <th className="px-3 py-2 text-left font-medium">Event</th>
                <th className="px-3 py-2 text-left font-medium">Mark</th>
                <th className="px-3 py-2 text-left font-medium">Adj (s)</th>
                <th className="px-3 py-2 text-left font-medium">Wind</th>
                <th className="px-3 py-2 text-left font-medium">Meet / Date</th>
                <th className="px-3 py-2 text-left font-medium">Proof</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: any, i: number) => {
                const p = r.profiles?.[0];
                const dateStr = r.meet_date ? new Date(r.meet_date).toISOString().slice(0,10) : "—";
                return (
                  <tr key={r.result_id ?? r.athlete_id} className="border-t">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Link href={`/athletes/${p?.username ?? r.athlete_id}`} className="text-blue-600 hover:underline">
                        {p?.full_name || p?.username || r.athlete_id}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {p?.school_name ?? "—"} {p?.class_year ? `• ${p.class_year}` : ""}
                    </td>
                    <td className="px-3 py-2">{r.event}</td>
                    <td className="px-3 py-2">{r.mark ?? r.best_mark_text ?? "—"}</td>
                    <td className="px-3 py-2">{r.mark_seconds_adj ?? r.best_seconds_adj ?? "—"}</td>
                    <td className="px-3 py-2">{r.wind ?? (r.wind_legal === false ? "NWI/IL" : "—")}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span>{r.meet_name ?? "—"}</span>
                        <span className="text-xs text-gray-500">{dateStr}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {r.proof_url ? (
                        <Link href={r.proof_url} target="_blank" className="text-blue-600 hover:underline">
                          View
                        </Link>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
