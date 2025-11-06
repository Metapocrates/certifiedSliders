// src/app/(protected)/admin/results/page.tsx
import { createSupabaseServer } from "@/lib/supabase/compat";
import SafeLink from "@/components/SafeLink";
import { approveResultAction, rejectResultAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

export default async function AdminResultsPage() {
  const supabase = createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-2">Results Queue</h1>
        <p className="text-sm text-red-700">You must be signed in.</p>
      </div>
    );
  }

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-2">Results Queue</h1>
        <p className="text-sm text-red-700">Unauthorized.</p>
      </div>
    );
  }

  // Pull all pending results, include profile summary via FK (results.athlete_id -> profiles.id)
  const { data: rows, error } = await supabase
    .from("results")
    .select(`
      id,
      athlete_id,
      event,
      mark,
      mark_seconds,
      timing,
      wind,
      season,
      meet_name,
      meet_date,
      proof_url,
      status,
      profiles!results_athlete_id_fkey (
        id,
        full_name,
        username,
        school_name,
        class_year,
        profile_id
      )
    `)
    .eq("status", "pending")
    .order("id", { ascending: false });

  if (error) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-4">Results Queue</h1>
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error.message}
        </div>
      </div>
    );
  }

  const pending = rows ?? [];

  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Results Queue</h1>
        <span className="text-sm text-gray-500">{pending.length} pending</span>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">
          No pending submissions.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm relative">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Athlete</th>
                <th className="px-3 py-2 text-left font-medium">Athlete ID</th>
                <th className="px-3 py-2 text-left font-medium">Event</th>
                <th className="px-3 py-2 text-left font-medium">Mark</th>
                <th className="px-3 py-2 text-left font-medium">Timing</th>
                <th className="px-3 py-2 text-left font-medium">Wind</th>
                <th className="px-3 py-2 text-left font-medium">Season</th>
                <th className="px-3 py-2 text-left font-medium">Meet</th>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Proof</th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r: any) => {
                const p = (r as any).profiles as
                  | { id: string; full_name: string | null; username: string | null; school_name: string | null; class_year: number | null; profile_id: string | null }
                  | null;

                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {p?.full_name || p?.username || r.athlete_id}
                          </span>
                          {p?.profile_id && (
                            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-700">
                              {p.profile_id}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {p?.school_name ? `${p.school_name}` : ""}{" "}
                          {p?.class_year ? `• ${p.class_year}` : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-gray-400">{r.athlete_id || "NULL"}</span>
                    </td>
                    <td className="px-3 py-2">{r.event ?? "—"}</td>
                    <td className="px-3 py-2">{r.mark ?? r.mark_seconds ?? "—"}</td>
                    <td className="px-3 py-2">{r.timing ?? "—"}</td>
                    <td className="px-3 py-2">{r.wind ?? "—"}</td>
                    <td className="px-3 py-2">{r.season ?? "—"}</td>
                    <td className="px-3 py-2">{r.meet_name ?? "—"}</td>
                    <td className="px-3 py-2">{fmtDate(r.meet_date)}</td>
                    <td className="px-3 py-2">
                      <SafeLink
                        href={r.proof_url}
                        target="_blank"
                        className="text-blue-600 hover:underline"
                        fallback="—"
                      >
                        View
                      </SafeLink>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <form action={approveResultAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            className="rounded-md bg-green-600 px-3 py-1.5 text-white text-xs hover:opacity-90"
                            type="submit"
                          >
                            Approve
                          </button>
                        </form>

                        <details className="relative">
                          <summary className="list-none">
                            <span className="rounded-md bg-red-600 px-3 py-1.5 text-white text-xs hover:opacity-90 cursor-pointer">
                              Reject
                            </span>
                          </summary>
                          <div className="absolute right-0 z-10 mt-2 w-64 rounded-lg border bg-white p-3 shadow-lg">
                            <form action={rejectResultAction} className="space-y-2">
                              <input type="hidden" name="id" value={r.id} />
                              <textarea
                                name="reason"
                                rows={3}
                                className="w-full rounded-md border px-2 py-1 text-xs"
                                placeholder="Reason for rejection (optional but recommended)"
                              />
                              <button
                                className="w-full rounded-md bg-red-600 px-3 py-1.5 text-white text-xs hover:opacity-90"
                                type="submit"
                              >
                                Confirm Reject
                              </button>
                            </form>
                          </div>
                        </details>
                      </div>
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