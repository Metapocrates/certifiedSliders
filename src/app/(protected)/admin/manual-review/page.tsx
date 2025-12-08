// src/app/(protected)/admin/manual-review/page.tsx
import { createSupabaseServer } from "@/lib/supabase/compat";
import SafeLink from "@/components/SafeLink";
import { approveManualReviewAction, rejectManualReviewAction } from "./actions";

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

type DiffField = {
  field: string;
  original: string;
  edited: string;
  changed: boolean;
};

function computeDiff(original: any, edited: any): DiffField[] {
  const fields: DiffField[] = [];
  const fieldNames = ["event", "markText", "markSeconds", "timing", "wind", "meetName", "meetDate"];

  fieldNames.forEach(field => {
    const origVal = String(original?.[field] ?? "—");
    const editVal = String(edited?.[field] ?? "—");
    fields.push({
      field,
      original: origVal,
      edited: editVal,
      changed: origVal !== editVal,
    });
  });

  return fields;
}

export default async function AdminManualReviewPage() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-2">Manual Review Queue</h1>
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
        <h1 className="text-2xl font-semibold mb-2">Manual Review Queue</h1>
        <p className="text-sm text-red-700">Unauthorized.</p>
      </div>
    );
  }

  // Pull all manual_review results with profile info
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
      source_payload,
      source_hash,
      profiles!results_athlete_id_fkey (
        id,
        full_name,
        username,
        school_name,
        class_year
      )
    `)
    .eq("status", "manual_review")
    .order("id", { ascending: false });

  if (error) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-4">Manual Review Queue</h1>
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
        <div>
          <h1 className="text-2xl font-semibold">Manual Review Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            These results were edited by users after parsing. Review changes before approving.
          </p>
        </div>
        <span className="text-sm text-amber-600 font-medium">{pending.length} awaiting review</span>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">
          No results awaiting manual review.
        </div>
      ) : (
        <div className="space-y-6">
          {pending.map((r: any) => {
            const p = (r as any).profiles as
              | { id: string; full_name: string | null; username: string | null; school_name: string | null; class_year: number | null }
              | null;

            const original = r.source_payload || {};
            const edited = {
              event: r.event,
              markText: r.mark,
              markSeconds: r.mark_seconds,
              timing: r.timing,
              wind: r.wind,
              meetName: r.meet_name,
              meetDate: r.meet_date,
            };

            const diff = computeDiff(original, edited);
            const hasChanges = diff.some(d => d.changed);

            return (
              <div key={r.id} className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-semibold text-gray-900">
                        {p?.full_name || p?.username || r.athlete_id}
                      </span>
                      <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded">
                        EDITED
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {p?.school_name ? `${p.school_name}` : ""}{" "}
                      {p?.class_year ? `• Class of ${p.class_year}` : ""}
                    </div>
                  </div>
                  <SafeLink
                    href={r.proof_url}
                    target="_blank"
                    className="text-sm text-blue-600 hover:underline"
                    fallback="—"
                  >
                    View Proof →
                  </SafeLink>
                </div>

                {/* Diff Table */}
                <div className="rounded-lg border bg-white overflow-hidden mb-4">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium w-1/4">Field</th>
                        <th className="px-3 py-2 text-left font-medium">Original (Athletic.net)</th>
                        <th className="px-3 py-2 text-left font-medium">Edited by User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diff.map((d, idx) => (
                        <tr
                          key={d.field}
                          className={`border-t ${d.changed ? "bg-amber-50" : ""}`}
                        >
                          <td className="px-3 py-2 font-medium">
                            {d.field}
                            {d.changed && (
                              <span className="ml-1 text-amber-600">●</span>
                            )}
                          </td>
                          <td className={`px-3 py-2 ${d.changed ? "line-through text-gray-400" : ""}`}>
                            {d.original}
                          </td>
                          <td className={`px-3 py-2 ${d.changed ? "font-semibold text-amber-700" : ""}`}>
                            {d.edited}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Metadata */}
                <div className="text-xs text-gray-500 mb-4">
                  <span>Result ID: {r.id}</span>
                  {r.source_hash && <span className="ml-3">Source hash: {r.source_hash.substring(0, 8)}...</span>}
                  {!hasChanges && (
                    <span className="ml-3 text-amber-600">⚠ No changes detected (may be a data issue)</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <form action={approveManualReviewAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      className="rounded-md bg-green-600 px-4 py-2 text-white text-sm font-medium hover:bg-green-700"
                      type="submit"
                    >
                      Approve Edited Result
                    </button>
                  </form>

                  <details className="relative">
                    <summary className="list-none">
                      <span className="rounded-md bg-red-600 px-4 py-2 text-white text-sm font-medium hover:bg-red-700 cursor-pointer inline-block">
                        Reject Changes
                      </span>
                    </summary>
                    <div className="absolute left-0 z-10 mt-2 w-80 rounded-lg border bg-white p-4 shadow-xl">
                      <form action={rejectManualReviewAction} className="space-y-3">
                        <input type="hidden" name="id" value={r.id} />
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Reason for rejection
                          </label>
                          <textarea
                            name="reason"
                            rows={3}
                            className="w-full rounded-md border px-3 py-2 text-sm"
                            placeholder="Explain why the edit was rejected..."
                            required
                          />
                        </div>
                        <button
                          className="w-full rounded-md bg-red-600 px-4 py-2 text-white text-sm font-medium hover:bg-red-700"
                          type="submit"
                        >
                          Confirm Rejection
                        </button>
                      </form>
                    </div>
                  </details>

                  <span className="text-xs text-gray-500 ml-auto">
                    Season: {r.season || "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
