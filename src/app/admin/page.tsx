// src/app/admin/page.tsx
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";
import { verifyResultAction } from "../(protected)/admin/actions";


type PendingRow = {
  id: number;
  athlete_id: string;
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
  source: string | null;
  created_at: string | null;
  profile_full_name: string | null;
  school_name: string | null;
  school_state: string | null;
};

function fmtMark(mark: string | null, secondsAdj: number | null, secondsRaw: number | null) {
  if (mark) return mark;
  const s = secondsAdj ?? secondsRaw;
  if (s == null) return "—";
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const rem = s - m * 60;
    return `${m}:${rem.toFixed(2).padStart(5, "0")}`;
  }
  return s.toFixed(2);
}

export const dynamic = "force-dynamic";

async function getPending(): Promise<PendingRow[]> {
  const supabase = createSupabaseServer();

  // Confirm admin (keeps this route protected even outside the (protected) group)
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Not signed in.");
  }
  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) {
    throw new Error("Admin access required.");
  }

  // Pull pending results + display info
  const { data, error } = await supabase
    .from("results")
    .select(`
      id, athlete_id, event, mark, mark_seconds, mark_seconds_adj, timing, wind, season,
      meet_name, meet_date, proof_url, source, created_at,
      profiles:athlete_id ( full_name, school_name, school_state )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    athlete_id: r.athlete_id,
    event: r.event,
    mark: r.mark,
    mark_seconds: r.mark_seconds,
    mark_seconds_adj: r.mark_seconds_adj,
    timing: r.timing,
    wind: r.wind,
    season: r.season,
    meet_name: r.meet_name,
    meet_date: r.meet_date,
    proof_url: r.proof_url,
    source: r.source,
    created_at: r.created_at,
    profile_full_name: r.profiles?.full_name ?? null,
    school_name: r.profiles?.school_name ?? null,
    school_state: r.profiles?.school_state ?? null,
  }));
}

export default async function AdminPage() {
  const rows = await getPending();

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Admin – Verify Results</h1>

      {!rows.length ? (
        <div className="text-sm text-muted-foreground">No pending results.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Result</th>
                <th className="py-2 pr-3">Athlete</th>
                <th className="py-2 pr-3">Event</th>
                <th className="py-2 pr-3">Timing</th>
                <th className="py-2 pr-3">Meet</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Proof</th>
                <th className="py-2 pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-medium">
                    {fmtMark(r.mark, r.mark_seconds_adj, r.mark_seconds)}
                  </td>
                  <td className="py-2 pr-3">
                    {r.profile_full_name ?? "Athlete"}
                    {r.school_name ? ` · ${r.school_name}${r.school_state ? ", " + r.school_state : ""}` : ""}
                  </td>
                  <td className="py-2 pr-3">{r.event}</td>
                  <td className="py-2 pr-3">{r.timing ?? "—"}</td>
                  <td className="py-2 pr-3">{r.meet_name ?? "—"}</td>
                  <td className="py-2 pr-3">
                    {r.meet_date
                      ? new Date(r.meet_date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    {r.proof_url ? (
                      <a
                        className="underline underline-offset-2"
                        href={r.proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        open
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <form action={verifyResultAction} className="inline">
                      <input type="hidden" name="resultId" value={r.id} />
                      <input type="hidden" name="decision" value="verify" />
                      <button className="rounded-md px-3 py-1.5 bg-emerald-600 text-app">
                        Verify
                      </button>
                    </form>
                    <form action={verifyResultAction} className="inline ml-2">
                      <input type="hidden" name="resultId" value={r.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <button className="rounded-md px-3 py-1.5 border">Reject</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
