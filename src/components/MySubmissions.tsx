// src/components/MySubmissions.tsx
// (server component)
import { createSupabaseServer } from "@/lib/supabase/compat";
import { deletePendingResultAction } from "@/app/(protected)/me/actions";

function fmtSeconds(s: number | null) {
  if (s == null) return "—";
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const rem = s - m * 60;
    const secStr = rem.toFixed(2).padStart(5, "0"); // ← correct usage
    return `${m}:${secStr}`;
  }
  return s.toFixed(2);
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" });
  } catch { return "—"; }
}

export default async function MySubmissions({ athleteId }: { athleteId: string }) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("results")
    .select("id,event,mark_seconds,mark_seconds_adj,meet_name,meet_date,status,proof_url")
    .eq("athlete_id", athleteId)
    .in("status", ["pending","blocked_until_verified"])
    .order("created_at", { ascending: false });

  if (error) return <div className="text-sm text-red-700">Couldn’t load submissions.</div>;
  const rows = data ?? [];
  if (!rows.length) return null;

  return (
    <div className="mt-8">
      <h3 className="text-base font-medium mb-2">My submissions (awaiting review)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-y-1">
          <thead className="text-xs subtle">
            <tr>
              <th className="py-1 pr-3 text-left">Event</th>
              <th className="py-1 pr-3 text-left">Time</th>
              <th className="py-1 pr-3 text-left">Meet</th>
              <th className="py-1 pr-3 text-left">Date</th>
              <th className="py-1 pr-3 text-left">Proof</th>
              <th className="py-1 pr-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
           {rows.map((r: any) => {

              const secs = r.mark_seconds_adj ?? r.mark_seconds ?? null;
              const actionable = r.status === "pending" || r.status === "blocked_until_verified";
              return (
                <tr key={r.id} className="bg-card card">
                  <td className="py-2 pr-3">{r.event ?? "—"}</td>
                  <td className="py-2 pr-3">{fmtSeconds(secs)}</td>
                  <td className="py-2 pr-3">{r.meet_name ?? "—"}</td>
                  <td className="py-2 pr-3">{fmtDate(r.meet_date)}</td>
                  <td className="py-2 pr-3">
                    {r.proof_url ? (
                      <a className="underline underline-offset-2" href={r.proof_url} target="_blank" rel="noreferrer">view</a>
                    ) : <span className="subtle">—</span>}
                  </td>
                  <td className="py-2 pr-3">
                    {actionable ? (
                      <form action={deletePendingResultAction}>
                        <input type="hidden" name="resultId" value={r.id} />
                        <button className="rounded-md px-3 py-1.5 border">Remove</button>
                      </form>
                    ) : <span className="subtle">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
