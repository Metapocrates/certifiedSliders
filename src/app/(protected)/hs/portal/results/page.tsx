// src/app/(protected)/hs/portal/results/page.tsx
import "server-only";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TeamResult = {
  result_id: number;
  athlete_id: string;
  athlete_name: string;
  athlete_profile_id: string | null;
  event: string;
  mark: string;
  meet_name: string;
  meet_date: string;
  season: string;
  status: string;
  confidence: number | null;
  wind: number | null;
  proof_url: string | null;
  is_attested: boolean;
  attested_by: string | null;
  attested_at: string | null;
};

export default async function TeamResultsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    team?: string;
    athlete?: string;
    event?: string;
    season?: string;
    status?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServer();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/hs/portal/results");
  }

  const teamId = resolvedSearchParams?.team;
  if (!teamId) {
    redirect("/hs/portal");
  }

  // Verify user is staff
  const { data: staffRecord } = await supabase
    .from("team_staff")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!staffRecord) {
    redirect("/hs/portal");
  }

  // Get team info
  const { data: team } = await supabase
    .from("teams")
    .select("school_name")
    .eq("id", teamId)
    .single();

  // Get results
  const { data: results } = await supabase.rpc("rpc_get_team_results", {
    p_team_id: teamId,
    p_athlete_id: resolvedSearchParams?.athlete || null,
    p_event: resolvedSearchParams?.event || null,
    p_season: resolvedSearchParams?.season || null,
    p_status: resolvedSearchParams?.status || null,
    p_limit: 100,
    p_offset: 0,
  });

  const teamResults = (results || []) as TeamResult[];

  // TODO: Add filters (athlete, event, season, status)
  // TODO: Add export functionality
  // TODO: Add pagination

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link href="/hs/portal" className="text-muted hover:text-app">
            ← Back to Portal
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-app">Team Results</h1>
        {team && (
          <p className="text-muted-foreground">
            View all results for {team.school_name} athletes
          </p>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-app bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Results</p>
          <p className="mt-2 text-3xl font-bold text-app">{teamResults.length}</p>
        </div>
        <div className="rounded-xl border border-app bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Verified</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {teamResults.filter((r) => r.status === "verified").length}
          </p>
        </div>
        <div className="rounded-xl border border-app bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Attested</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {teamResults.filter((r) => r.is_attested).length}
          </p>
        </div>
      </div>

      {/* Results Table */}
      {teamResults.length === 0 ? (
        <div className="rounded-xl border border-app bg-card p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl mb-4">
            📊
          </div>
          <h3 className="text-lg font-semibold text-app mb-2">No Results Yet</h3>
          <p className="text-sm text-muted">
            Results will appear here as your athletes submit them
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-app bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-app">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                    Athlete
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                    Mark
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                    Meet
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {teamResults.map((result) => (
                  <tr key={result.result_id} className="hover:bg-muted/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-app">{result.athlete_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-app">{result.event}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-lg font-bold text-app">{result.mark}</span>
                      {result.wind !== null && (
                        <span className="ml-1 text-xs text-muted">({result.wind > 0 ? "+" : ""}{result.wind})</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-app">{result.meet_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted">
                        {new Date(result.meet_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                            result.status === "verified"
                              ? "border-green-300 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                              : result.status === "pending"
                              ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200"
                              : "border-gray-300 bg-gray-50 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {result.status}
                        </span>
                        {result.is_attested && (
                          <span className="inline-flex items-center rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                            Attested
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
