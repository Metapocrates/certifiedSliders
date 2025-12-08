import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import SafeLink from "@/components/SafeLink";
import { dismissReportAction, actionReportAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminReportsPage() {
  const supabase = await createSupabaseServer();

  // Check auth + admin
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  if (!user) redirect("/login");

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
        <p className="text-red-700">Admin privileges required.</p>
      </div>
    );
  }

  // Fetch reports with result and profile info
  const { data: reports } = await supabase
    .from("result_reports")
    .select(`
      id,
      result_id,
      reason,
      details,
      status,
      created_at,
      reviewed_at,
      admin_notes,
      reported_by,
      results!result_reports_result_id_fkey (
        id,
        event,
        mark,
        meet_name,
        meet_date,
        proof_url,
        athlete_id,
        status,
        profiles!results_athlete_id_fkey (
          id,
          username,
          full_name,
          profile_id
        )
      )
    `)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);

  const pendingReports = (reports || []).filter((r) => r.status === "pending");
  const reviewedReports = (reports || []).filter((r) => r.status !== "pending");

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function ReportCard({ report, isPending }: { report: any; isPending: boolean }) {
    const result = report.results;
    const profile = result?.profiles;

    if (!result || !profile) {
      return null;
    }

    return (
      <div
        className={`rounded-xl border p-5 ${
          isPending
            ? "border-red-200 bg-red-50/30"
            : report.status === "actioned"
              ? "border-green-200 bg-green-50/30"
              : "border-gray-200 bg-gray-50"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                  isPending
                    ? "bg-red-600 text-white"
                    : report.status === "actioned"
                      ? "bg-green-600 text-white"
                      : "bg-gray-600 text-white"
                }`}
              >
                {report.status}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(report.created_at)}
              </span>
            </div>

            {/* Result Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {result.event} - {result.mark}
              </h3>
              <p className="text-sm text-gray-600">
                <SafeLink
                  href={`/athletes/${profile.profile_id}`}
                  className="font-medium text-app hover:underline"
                >
                  {profile.full_name || profile.username}
                </SafeLink>
                {profile.profile_id && (
                  <span className="ml-2 font-mono text-xs text-gray-400">
                    ({profile.profile_id})
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {result.meet_name} • {result.meet_date}
                {result.proof_url && (
                  <>
                    {" • "}
                    <SafeLink
                      href={result.proof_url}
                      target="_blank"
                      className="text-scarlet hover:underline"
                    >
                      View proof
                    </SafeLink>
                  </>
                )}
              </p>
            </div>

            {/* Report Details */}
            <div className="rounded-lg bg-white p-3">
              <p className="text-sm font-medium text-gray-900">
                Reason: {report.reason}
              </p>
              {report.details && (
                <p className="mt-1 text-sm text-gray-600">{report.details}</p>
              )}
            </div>

            {report.admin_notes && (
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs font-semibold text-blue-900">Admin Notes:</p>
                <p className="mt-1 text-sm text-blue-700">{report.admin_notes}</p>
                {report.reviewed_at && (
                  <p className="mt-1 text-xs text-blue-600">
                    Reviewed: {formatDate(report.reviewed_at)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {isPending && (
            <div className="flex flex-col gap-2">
              <form action={actionReportAction}>
                <input type="hidden" name="id" value={report.id} />
                <input type="hidden" name="result_id" value={result.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Remove Result
                </button>
              </form>
              <form action={dismissReportAction}>
                <input type="hidden" name="id" value={report.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Dismiss
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold text-app">Result Reports</h1>
        <p className="mt-2 text-sm text-muted">
          User-submitted reports of suspicious or incorrect results
        </p>
      </div>

      {/* Pending Reports */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Pending ({pendingReports.length})
        </h2>
        {pendingReports.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600">
            No pending reports
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReports.map((report) => (
              <ReportCard key={report.id} report={report} isPending={true} />
            ))}
          </div>
        )}
      </section>

      {/* Reviewed Reports */}
      {reviewedReports.length > 0 && (
        <details className="rounded-xl border border-gray-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold text-gray-700 hover:text-app">
            Reviewed Reports ({reviewedReports.length})
          </summary>
          <div className="mt-4 space-y-4">
            {reviewedReports.map((report) => (
              <ReportCard key={report.id} report={report} isPending={false} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
