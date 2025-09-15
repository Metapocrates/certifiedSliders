// Server component: fetches VERIFIED results, dedupes, renders a simple table.
import { createSupabaseServer } from "@/lib/supabase/compat";
import { dedupeResults } from "@/lib/results/dedupe";

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
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export default async function VerifiedResultsList({
  athleteId,
  limit = 100,
}: {
  athleteId: string;
  limit?: number;
}) {
  const supabase = createSupabaseServer();

  const { data, error } = await supabase
    .from("results")
    .select(
      "id,event,mark_seconds,mark_seconds_adj,meet_name,meet_date,timing,status"
    )
    .eq("athlete_id", athleteId)
    .eq("status", "verified")              // ← only VERIFIED
    .order("meet_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return <div className="text-sm text-red-700">Failed to load results.</div>;
  }

  const rows = dedupeResults(data ?? []);

  if (!rows.length) {
    return <div className="text-sm subtle">No verified results yet.</div>;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-1">
        <thead>
          <tr className="text-left text-xs subtle">
            <th className="py-1 pr-3">Event</th>
            <th className="py-1 pr-3">Time</th>
            <th className="py-1 pr-3">Meet</th>
            <th className="py-1 pr-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const seconds = r.mark_seconds_adj ?? r.mark_seconds ?? null;
            return (
              <tr key={r.id} className="bg-white card">
                <td className="py-2 pr-3">{r.event ?? "—"}</td>
                <td className="py-2 pr-3">{fmtSeconds(seconds)}</td>
                <td className="py-2 pr-3">{r.meet_name ?? "—"}</td>
                <td className="py-2 pr-3">{fmtDate(r.meet_date)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
