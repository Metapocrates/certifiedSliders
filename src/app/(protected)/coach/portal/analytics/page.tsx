/**
 * Coach Portal Analytics Page (Premium Feature)
 *
 * Shows aggregated insights about interested athletes
 */

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getProgramEntitlements, canAccessFeature } from "@/lib/entitlements";
import { UpgradeCard } from "@/components/coach/UpgradeCard";

interface AnalyticsRow {
  class_year: number;
  interested_count: number;
  high_star_count: number;
  verified_count: number;
  commit_count: number;
  states_count: number;
  shared_contact_count: number;
}

interface StatsSummary {
  total_interested: number;
  total_commits: number;
  total_verified: number;
  total_high_stars: number;
  avg_star_rating: number;
}

export default async function CoachAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ program?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServer();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/coach/portal/analytics");

  // Get program ID from query param or get first membership
  let programId: string = resolvedSearchParams?.program || "";

  if (!programId) {
    const { data: memberships } = await supabase
      .from("program_memberships")
      .select("program_id")
      .eq("user_id", user.id)
      .limit(1);

    if (!memberships || memberships.length === 0) {
      redirect("/coach/onboarding");
    }

    programId = memberships[0].program_id;
  }

  // Verify access to program
  const { data: membership } = await supabase
    .from("program_memberships")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .maybeSingle();

  if (!membership) {
    redirect("/coach/portal");
  }

  // Get program info
  const { data: program } = await supabase
    .from("programs")
    .select("name, short_name")
    .eq("id", programId)
    .single();

  // Get entitlements
  const entitlements = await getProgramEntitlements(programId);
  const hasAnalytics = entitlements
    ? canAccessFeature(entitlements, "analytics_enabled")
    : false;

  // If no analytics access, show upgrade prompt
  if (!hasAnalytics) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            {program?.name || "Your Program"}
          </p>
        </div>

        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="mx-auto max-w-md">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              Analytics is a Premium Feature
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Upgrade to Premium to unlock detailed insights about your interested athletes,
              including breakdowns by class year, star ratings, verification status, and more.
            </p>

            <div className="mt-6">
              <UpgradeCard programId={programId} entitlements={entitlements} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fetch analytics data
  const { data: analytics, error: analyticsError } = await supabase.rpc(
    "rpc_get_program_analytics",
    {
      _program_id: programId,
    }
  );

  const { data: summaryData, error: summaryError } = await supabase.rpc(
    "rpc_get_program_stats_summary",
    {
      _program_id: programId,
    }
  );

  const analyticsRows = (analytics || []) as AnalyticsRow[];
  const summary = (summaryData?.[0] || {
    total_interested: 0,
    total_commits: 0,
    total_verified: 0,
    total_high_stars: 0,
    avg_star_rating: 0,
  }) as StatsSummary;

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coach Portal</h1>
          <p className="mt-1 text-sm text-gray-600">
            {program?.name || "Your Program"}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-8">
          <a
            href={`/coach/portal${programId ? `?program=${programId}` : ""}`}
            className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
          >
            Athletes
          </a>
          <a
            href={`/coach/portal/analytics${programId ? `?program=${programId}` : ""}`}
            className="border-b-2 border-purple-600 px-1 py-4 text-sm font-medium text-purple-600"
          >
            Analytics
          </a>
        </nav>
      </div>

      {/* Summary Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Interested"
          value={summary.total_interested}
          color="blue"
        />
        <StatCard
          label="Commitments"
          value={summary.total_commits}
          color="green"
        />
        <StatCard
          label="Verified Athletes"
          value={summary.total_verified}
          color="purple"
        />
        <StatCard
          label="High Stars (4-5★)"
          value={summary.total_high_stars}
          color="yellow"
        />
        <StatCard
          label="Avg Star Rating"
          value={summary.avg_star_rating.toFixed(1)}
          color="gray"
        />
      </div>

      {/* Breakdown by Class Year */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Breakdown by Class Year
          </h2>
        </div>

        {analyticsRows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">
              No interested athletes yet. Athletes will appear here when they express
              interest in your program.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Class Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Total Interested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    High Stars
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Verified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Commits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Shared Contact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {analyticsRows.map((row) => (
                  <tr key={row.class_year} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {row.class_year}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {row.interested_count}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {row.high_star_count}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {row.verified_count}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {row.commit_count}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {row.shared_contact_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error Messages */}
      {(analyticsError || summaryError) && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            {analyticsError?.message || summaryError?.message}
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: "blue" | "green" | "purple" | "yellow" | "gray";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-900",
    green: "bg-green-50 text-green-900",
    purple: "bg-purple-50 text-purple-900",
    yellow: "bg-yellow-50 text-yellow-900",
    gray: "bg-gray-50 text-gray-900",
  };

  return (
    <div className={`rounded-lg border border-gray-200 p-4 ${colorClasses[color]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
