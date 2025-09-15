// src/components/ResultsTable.tsx
// Server-friendly (no "use client"); safe to render from server pages.
type Row = {
  id: number | string;
  event: string | null;
  mark?: string | null;
  mark_seconds: number | null;
  mark_seconds_adj: number | null;
  timing?: "FAT" | "hand" | null;
  wind?: number | null;
  season?: "INDOOR" | "OUTDOOR" | null;
  meet_name?: string | null;
  meet_date?: string | null; // ISO
  proof_url?: string | null;
  status?: string | null;
};

export default function ResultsTable({
  rows,
  bestByEvent = {},
}: {
  rows: Row[];
  bestByEvent?: Record<string, number | null | undefined>;
}) {
  function fmtSeconds(s: number | null | undefined) {
    if (s == null) return "—";
    if (s >= 60) {
      const m = Math.floor(s / 60);
      const rem = s - m * 60;
      return `${m}:${rem.toFixed(2).padStart(5, "0")}`;
    }
    return s.toFixed(2);
  }
  function fmtDate(iso?: string | null) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-y-1">
        <thead className="text-xs subtle">
          <tr>
            <th className="py-1 pr-3 text-left">Event</th>
            <th className="py-1 pr-3 text-left">Time</th>
            <th className="py-1 pr-3 text-left">Meet</th>
            <th className="py-1 pr-3 text-left">Date</th>
            <th className="py-1 pr-3 text-left">Proof</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const secondsAdj = r.mark_seconds_adj;
            const secondsRaw = r.mark_seconds;
            const secondsToShow = secondsAdj ?? secondsRaw ?? null;
            const showAdjBadge =
              secondsAdj != null &&
              secondsRaw != null &&
              secondsAdj !== secondsRaw;

            const isBest =
              r.event &&
              bestByEvent[r.event] != null &&
              secondsAdj != null &&
              bestByEvent[r.event!] === secondsAdj;

            return (
              <tr key={r.id} className="bg-white card">
                <td className="py-2 pr-3">
                  {r.event ?? "—"}{" "}
                  {isBest ? (
                    <span className="ml-1 text-amber-500" title="Best for event">
                      ★
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-3">
                  {fmtSeconds(secondsToShow)}{" "}
                  {r.timing ? <span className="subtle">({r.timing})</span> : null}
                  {showAdjBadge ? (
                    <span className="ml-2 text-[10px] px-1 py-0.5 rounded bg-neutral-100 border">
                      adj.
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-3">{r.meet_name ?? "—"}</td>
                <td className="py-2 pr-3">{fmtDate(r.meet_date)}</td>
                <td className="py-2 pr-3">
                  {r.proof_url ? (
                    <a
                      href={r.proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      view
                    </a>
                  ) : (
                    <span className="subtle">—</span>
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center subtle">
                No results to display.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
