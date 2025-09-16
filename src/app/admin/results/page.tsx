export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { approveResult, rejectResult } from "@/app/actions/admin/results";

type Row = {
  id: number;
  athlete_id: string;
  event: string | null;
  mark: string | null;
  timing: "FAT" | "hand" | null;
  wind: number | null;
  source: string;
  status: string;
  proof_url: string | null;
  meet_name: string | null;
  meet_date: string | null;
  created_at: string;
};

export default async function AdminResultsPage() {
  const supabase = supabaseServer();

  // ✅ Auth check (unauthenticated → /signin)
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/signin");

  // ✅ Admin check (authenticated but not admin → home)
  const { data: adminRow, error: adminErr } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (adminErr || !adminRow) redirect("/");

  // ✅ Load pending results
  const { data: rows, error } = await supabase
    .from("results")
    .select(
      "id, athlete_id, event, mark, timing, wind, source, status, proof_url, meet_name, meet_date, created_at"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-semibold">Pending Results</h1>
        <p className="mt-4 text-sm text-red-600">Error: {error.message}</p>
      </main>
    );
  }

  // (Optional) fetch proofs for quick context
  const ids = (rows ?? []).map((r) => r.id);
  const proofByResult: Record<
    number,
    { id: number; url: string; status: string; confidence: number | null }
  > = {};
  if (ids.length) {
    const { data: proofs } = await supabase
      .from("proofs")
      .select("id, result_id, url, status, confidence")
      .in("result_id", ids);

    for (const p of proofs ?? []) {
      proofByResult[(p as any).result_id as number] = p as any;
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Pending Results</h1>
      {!rows?.length && (
        <p className="text-sm text-gray-600">No pending results.</p>
      )}

      <ul className="space-y-3">
        {rows?.map((r: Row) => {
          const p = proofByResult[r.id];
          return (
            <li key={r.id} className="rounded-md border p-4">
              <div className="flex justify-between gap-4">
                <div className="text-sm">
                  <div>
                    <b>{r.event ?? "UNKNOWN"}</b> — {r.mark}
                    {r.timing ? ` (${r.timing})` : ""}{" "}
                    {typeof r.wind === "number" ? `• Wind ${r.wind}` : ""}
                  </div>
                  <div className="text-gray-600">
                    {r.meet_name ?? "—"} {r.meet_date ? `• ${r.meet_date}` : ""}
                  </div>
                  <div className="text-xs text-muted">
                    Result #{r.id} • Source: {r.source} •{" "}
                    {new Date(r.created_at).toLocaleString()}
                  </div>

                  {p && (
                    <div className="text-xs">
                      Proof:{" "}
                      <a href={p.url} target="_blank" className="underline">
                        open
                      </a>{" "}
                      • status {p.status} • conf{" "}
                      {((p.confidence ?? 0) * 100).toFixed(0)}%
                    </div>
                  )}

                  {!p && r.proof_url && (
                    <div className="text-xs">
                      Proof URL:{" "}
                      <a
                        href={r.proof_url as any}
                        target="_blank"
                        className="underline"
                      >
                        open
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <form action={approveResult.bind(null, r.id)}>
                    <button
                      type="submit"
                      className="rounded-md bg-green-600 px-3 py-1 text-sm text-app"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectResult.bind(null, r.id)}>
                    <button
                      type="submit"
                      className="rounded-md bg-red-600 px-3 py-1 text-sm text-app"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
