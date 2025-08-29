import Link from "next/link";
import type { RankingRow } from "@/lib/rankings";

function fmtMark(row: RankingRow) {
  if (row.mark) return row.mark;
  if (row.mark_seconds == null) return "—";
  const s = row.mark_seconds;
  const minutes = Math.floor(s / 60);
  const secs = s % 60;
  return minutes > 0
    ? `${minutes}:${secs.toFixed(2).padStart(5, "0")}`
    : secs.toFixed(2);
}

function fmtAdj(row: RankingRow) {
  if (row.mark_seconds == null) return "—";
  const s = row.mark_seconds;
  const minutes = Math.floor(s / 60);
  const secs = s % 60;
  return minutes > 0
    ? `${minutes}:${secs.toFixed(2).padStart(5, "0")}`
    : secs.toFixed(2);
}

export default function RankingsTable({ rows, startRank = 1 }: { rows: RankingRow[]; startRank?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Athlete</th>
            <th className="py-2 pr-2">School / State</th>
            <th className="py-2 pr-2">Class</th>
            <th className="py-2 pr-2">Best</th>
            <th className="py-2 pr-2">Adj</th>
            <th className="py-2 pr-2">Timing</th>
            <th className="py-2 pr-2">Meet / Date</th>
            <th className="py-2 pr-2">Proof</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={`${r.athlete_id}-${idx}`} className="border-b hover:bg-muted/40">
              <td className="py-2 pr-2 tabular-nums">{startRank + idx}</td>
              <td className="py-2 pr-2 font-medium">
                <Link href={`/athlete/${r.athlete_id}`} className="hover:underline">{r.full_name}</Link>
              </td>
              <td className="py-2 pr-2">{r.school_name ?? "—"} {r.school_state ? `(${r.school_state})` : ""}</td>
              <td className="py-2 pr-2">{r.class_year ?? "—"}</td>
              <td className="py-2 pr-2 tabular-nums">{fmtMark(r)}{r.wind_legal === false ? "*" : ""}</td>
              <td className="py-2 pr-2 tabular-nums">{fmtAdj(r)}</td>
              <td className="py-2 pr-2">{r.timing ?? "—"}</td>
              <td className="py-2 pr-2">{r.meet_name ?? "—"}{r.meet_date ? ` • ${new Date(r.meet_date).toLocaleDateString()}` : ""}</td>
              <td className="py-2 pr-2">
                {r.proof_url ? (
                  <a href={r.proof_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">link</a>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
