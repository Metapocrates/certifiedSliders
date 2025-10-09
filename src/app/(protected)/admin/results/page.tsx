// src/app/(protected)/admin/results/page.tsx
import Link from "next/link";
import SubmitButton from "./SubmitButton";
import {
  getPendingResultsAction,
  approveResultAction,
  rejectResultAction,
} from "./actions";
import SafeLink from "@/components/SafeLink";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function proofBadge(url?: string | null) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    let label = host;
    if (host.includes("athletic.net")) label = "athletic.net";
    else if (host.includes("milesplit")) label = "milesplit";

    return (
      <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] leading-5 text-neutral-600 border-neutral-300/70 dark:border-neutral-700/70">
        {label}
      </span>
    );
  } catch {
    return null;
  }
}

function Toast({ kind, msg }: { kind: "error" | "success"; msg: string }) {
  const cls =
    kind === "success"
      ? "border-green-300 bg-green-50 text-green-800"
      : "border-red-300 bg-red-50 text-red-800";
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>
      {msg}
    </div>
  );
}

export default async function AdminResultsPage() {
  const res = await getPendingResultsAction();
  if (!res.ok) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-4">Results Queue</h1>
        <Toast kind="error" msg={res.error ?? "Unauthorized"} />
      </div>
    );
  }

  const rows = res.data ?? [];

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Results Queue</h1>
        <span className="text-sm text-gray-500">{rows.length} pending</span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">
          No pending submissions.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Athlete</th>
                <th className="px-3 py-2 text-left font-medium">Event</th>
                <th className="px-3 py-2 text-left font-medium">Mark</th>
                <th className="px-3 py-2 text-left font-medium">Timing</th>
                <th className="px-3 py-2 text-left font-medium">Wind</th>
                <th className="px-3 py-2 text-left font-medium">Meet</th>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Proof</th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => {
                const p = r.profiles?.[0];
                const dateStr = r.meet_date
                  ? new Date(r.meet_date).toISOString().slice(0, 10)
                  : "—";
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {p?.full_name || p?.username || r.athlete_id}
                        </span>
                        <span className="text-xs text-gray-500">
                          {p?.school_name ? `${p.school_name}` : ""}{" "}
                          {p?.class_year ? `• ${p.class_year}` : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{r.event}</td>
                    <td className="px-3 py-2">{r.mark}</td>
                    <td className="px-3 py-2">{r.timing ?? "—"}</td>
                    <td className="px-3 py-2">{r.wind ?? "—"}</td>
                    <td className="px-3 py-2">{r.meet_name}</td>
                    <td className="px-3 py-2">{dateStr}</td>
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
                          <SubmitButton className="rounded-md bg-green-600 px-3 py-1.5 text-white text-xs">
                            Approve
                          </SubmitButton>
                        </form>
                        <details className="relative">
                          <summary className="list-none">
                            <span className="rounded-md bg-red-600 px-3 py-1.5 text-white text-xs hover:opacity-90 cursor-pointer">
                              Reject
                            </span>
                          </summary>
                          <div className="absolute z-10 mt-2 w-64 rounded-lg border bg-white p-3 shadow">
                            <form action={rejectResultAction} className="space-y-2">
                              <input type="hidden" name="id" value={r.id} />
                              <textarea
                                name="reason"
                                rows={3}
                                className="w-full rounded-md border px-2 py-1 text-xs"
                                placeholder="Optional reason…"
                              />
                              <SubmitButton className="w-full rounded-md bg-red-600 px-3 py-1.5 text-white text-xs">
                                Confirm Reject
                              </SubmitButton>
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
