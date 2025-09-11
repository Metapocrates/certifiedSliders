export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "@/lib/supabase/server";

type Result = {
  id: number;
  athlete_id: string;
  event: string | null;
  mark: string | null;
  timing: "FAT" | "hand" | null;
  wind: number | null;
  meet_name: string | null;
  meet_date: string | null;
  created_at: string;
  status?: string | null;
};

export default async function ResultsPage() {
  const supabase = supabaseServer();

  // Fetch recent APPROVED results (public)
  const { data: rows, error } = await supabase
    .from("results")
    .select(
      "id, athlete_id, event, mark, timing, wind, meet_name, meet_date, created_at, status"
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  // Map athlete_id -> profile display name (best effort)
  const ids = Array.from(
    new Set((rows ?? []).map((r) => r.athlete_id))
  ).filter(Boolean) as string[];

  const profilesById: Record<
    string,
    { full_name: string | null; username: string | null }
  > = {};

  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", ids);

    for (const p of profs ?? []) {
      const id = (p as any).id as string;
      profilesById[id] = {
        full_name: (p as any).full_name ?? null,
        username: (p as any).username ?? null,
      };
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Results</h1>
        <p className="text-sm text-gray-600">
          Recently approved results. More filters and sorting coming soon.
        </p>
      </header>

      {error && (
        <p className="text-sm text-red-600">
          Error loading results: {error.message}
        </p>
      )}

      {!rows?.length ? (
        <p className="text-sm text-gray-600">No approved results yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {rows.map((r: Result) => {
            const prof = profilesById[r.athlete_id] ?? null;
            const name =
              prof?.full_name || prof?.username || r.athlete_id.slice(0, 8);

            return (
              <li key={r.id} className="p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <b>{r.event ?? "UNKNOWN"}</b> — {r.mark ?? "—"}
                    {r.timing ? ` (${r.timing})` : ""}{" "}
                    {typeof r.wind === "number" ? `• Wind ${r.wind}` : ""}
                    <span className="text-gray-500"> • {name}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {r.meet_name ?? "—"} {r.meet_date ? `• ${r.meet_date}` : ""} •{" "}
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
