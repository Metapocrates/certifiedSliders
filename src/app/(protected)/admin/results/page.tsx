// src/app/(protected)/admin/results/page.tsx
import SafeLink from "@/components/SafeLink";
import {
  getPendingResultsAction,
} from "./actions";
import InlineActions from "./InlineActions";
import AdminResultsClientUI from "./AdminResultsClientUI";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ToastBox({ kind, msg }: { kind: "error" | "success"; msg: string }) {
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
        <ToastBox kind="error" msg={res.error ?? "Unauthorized"} />
      </div>
    );
  }

  const rows = res.data ?? [];

  return (
    <div className="container py-8">
      {/* Client toaster host */}
      <AdminResultsClientUI />

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
                      <InlineActions id={r.id} />
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