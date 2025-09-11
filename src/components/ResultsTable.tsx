"use client";

type ResultRow = {
  id: number | string;
  event: string;
  mark: string | null;
  mark_seconds: number | null;
  mark_seconds_adj: number | null;
  timing: "FAT" | "hand" | null;
  wind: number | null;
  season: string | null;
  meet_name: string | null;
  meet_date: string | null;
  proof_url: string | null;
  status: string | null;
  source: string | null;
};

function fmtMark(row: ResultRow) {
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

export default function ResultsTable({
  rows,
  bestByEvent,
}: {
  rows: ResultRow[];
  bestByEvent: Record<string, number | null | undefined>;
}) {
  if (!rows?.length) {
    return <div className="text-sm text-muted-foreground">No verified results yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-3">Event</th>
            <th className="py-2 pr-3">Result</th>
            <th className="py-2 pr-3">Wind</th>
            <th className="py-2 pr-3">Timing</th>
            <th className="py-2 pr-3">Meet</th>
            <th className="py-2 pr-3">Date</th>
            <th className="py-2 pr-3">Proof</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const best = bestByEvent[r.event];
            const isPR =
              typeof best === "number" &&
              typeof r.mark_seconds_adj === "number" &&
              Math.abs(r.mark_seconds_adj - best) < 1e-6; // equals best (time events)
            return (
              <tr key={r.id} className="border-b last:border-b-0">
                <td className="py-2 pr-3">{r.event}</td>
                <td className="py-2 pr-3 font-medium">
                  {fmtMark(r)}
                  {isPR ? <span className="ml-2 rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 border border-emerald-200">PR</span> : null}
                </td>
                <td className="py-2 pr-3">{r.wind == null ? "—" : (r.wind >= 0 ? `+${r.wind}` : `${r.wind}`)}</td>
                <td className="py-2 pr-3">{r.timing ?? "—"}</td>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
