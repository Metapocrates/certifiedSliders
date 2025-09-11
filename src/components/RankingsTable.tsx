"use client";

import Link from "next/link";

export type RankingsRow = {
  athlete_id: string;
  full_name: string;
  class_year: number | null;
  gender: "M" | "F" | string;
  school_name: string;
  school_state: string;
  event: string;
  mark: string | null;
  mark_seconds: number | null;
  mark_seconds_adj: number | null;
  wind: number | null;
  season: string | null;
  meet_name: string | null;
  meet_date: string | null; // ISO string (date)
  proof_url: string | null;
};

function fmtMark(row: RankingsRow) {
  // Prefer original mark text if available; otherwise format seconds as mm:ss.ss or s.ss
  if (row.mark) return row.mark;
  const s = row.mark_seconds_adj ?? row.mark_seconds;
  if (s == null) return "—";
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const rem = s - m * 60;
    return `${m}:${rem.toFixed(2).padStart(5, "0")}`;
  }
  return s.toFixed(2);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function RankingsTable({ rows }: { rows: RankingsRow[] }) {
  if (!rows.length) {
    return <div className="text-sm text-muted-foreground">No results match those filters yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-3">#</th>
            <th className="py-2 pr-3">Athlete</th>
            <th className="py-2 pr-3">Class</th>
            <th className="py-2 pr-3">Gender</th>
            <th className="py-2 pr-3">School</th>
            <th className="py-2 pr-3">Event</th>
            <th className="py-2 pr-3">Best</th>
            <th className="py-2 pr-3">Wind</th>
            <th className="py-2 pr-3">Meet</th>
            <th className="py-2 pr-3">Date</th>
            <th className="py-2 pr-3">Proof</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={`${r.athlete_id}-${r.event}`} className="border-b last:border-b-0">
              <td className="py-2 pr-3">{idx + 1}</td>
              <td className="py-2 pr-3">
                <Link
                  href={`/athlete/${r.athlete_id}`}
                  className="underline underline-offset-2"
                >
                  {r.full_name || "Athlete"}
                </Link>
              </td>
              <td className="py-2 pr-3">{r.class_year ?? "—"}</td>
              <td className="py-2 pr-3">{r.gender}</td>
              <td className="py-2 pr-3">
                {r.school_name}
                {r.school_state ? `, ${r.school_state}` : ""}
              </td>
              <td className="py-2 pr-3">{r.event}</td>
              <td className="py-2 pr-3 font-medium">{fmtMark(r)}</td>
              <td className="py-2 pr-3">{r.wind == null ? "—" : (r.wind >= 0 ? `+${r.wind}` : `${r.wind}`)}</td>
              <td className="py-2 pr-3">{r.meet_name ?? "—"}</td>
              <td className="py-2 pr-3">{fmtDate(r.meet_date)}</td>
              <td className="py-2 pr-3">
                {r.proof_url ? (
                  <a className="underline underline-offset-2" href={r.proof_url} target="_blank" rel="noopener noreferrer">
                    open
                  </a>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { RankingsTable };
