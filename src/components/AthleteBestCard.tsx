"use client";

type BestItem = {
  event: string;
  mark: string | null;
  mark_seconds_adj: number | null;
  wind: number | null;
  meet_name: string | null;
  meet_date: string | null;
  proof_url: string | null;
};

function fmtMark(mark: string | null, secondsAdj: number | null) {
  if (mark) return mark;
  if (secondsAdj == null) return "—";
  if (secondsAdj >= 60) {
    const m = Math.floor(secondsAdj / 60);
    const rem = secondsAdj - m * 60;
    return `${m}:${rem.toFixed(2).padStart(5, "0")}`;
  }
  return secondsAdj.toFixed(2);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function AthleteBestCard({ items }: { items: BestItem[] }) {
  if (!items?.length) {
    return (
      <div className="border rounded-xl p-4">
        <h3 className="text-base font-medium mb-2">Best Marks</h3>
        <div className="text-sm text-muted-foreground">No marks yet.</div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-4">
      <h3 className="text-base font-medium mb-2">Best Marks</h3>
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.event} className="flex flex-col">
            <div className="flex items-baseline justify-between">
              <div className="font-medium">{it.event}</div>
              <div className="text-sm">{fmtMark(it.mark, it.mark_seconds_adj)}</div>
            </div>
            <div className="text-xs text-muted-foreground">
              {it.meet_name ?? "—"} • {fmtDate(it.meet_date)} • {it.wind == null ? "—" : (it.wind >= 0 ? `+${it.wind}` : `${it.wind}`)}
              {it.proof_url ? (
                <>
                  {" • "}
                  <a className="underline underline-offset-2" href={it.proof_url} target="_blank" rel="noopener noreferrer">proof</a>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
