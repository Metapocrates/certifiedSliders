// src/app/(protected)/hs/portal/analytics/page.tsx
import "server-only";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ team?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServer();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/hs/portal/analytics");
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

  // Get analytics
  const { data: analytics } = await supabase.rpc("rpc_get_team_analytics", {
    p_team_id: teamId,
  });

  const stats = analytics?.[0] || {
    total_athletes: 0,
    active_athletes: 0,
    total_results: 0,
    verified_results: 0,
    results_last_30d: 0,
    avg_confidence: 0,
    last_result_date: null,
    pending_attestations: 0,
    pending_invites: 0,
    pending_requests: 0,
  };

  // TODO: Add charts (results over time, athlete performance trends)
  // TODO: Add export analytics functionality
  // TODO: Add event-specific breakdowns
  // TODO: Add athlete performance leaderboards

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link href="/hs/portal" className="text-muted hover:text-app">
            ← Back to Portal
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-app">Team Analytics</h1>
        {team && (
          <p className="text-muted-foreground">
            Performance insights for {team.school_name}
          </p>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-app bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Active Athletes</p>
          <p className="mt-2 text-4xl font-bold text-app">{stats.active_athletes}</p>
          <p className="mt-1 text-xs text-muted">of {stats.total_athletes} total</p>
        </div>

        <div className="rounded-xl border border-app bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Total Results</p>
          <p className="mt-2 text-4xl font-bold text-app">{stats.total_results}</p>
          <p className="mt-1 text-xs text-muted">{stats.verified_results} verified</p>
        </div>

        <div className="rounded-xl border border-app bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Last 30 Days</p>
          <p className="mt-2 text-4xl font-bold text-app">{stats.results_last_30d}</p>
          <p className="mt-1 text-xs text-muted">new results</p>
        </div>

        <div className="rounded-xl border border-app bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Avg Confidence</p>
          <p className="mt-2 text-4xl font-bold text-app">
            {stats.avg_confidence ? Math.round(stats.avg_confidence) : "-"}
          </p>
          <p className="mt-1 text-xs text-muted">result quality score</p>
        </div>

        <div className="rounded-xl border border-app bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Last Result</p>
          <p className="mt-2 text-2xl font-bold text-app">
            {stats.last_result_date
              ? new Date(stats.last_result_date).toLocaleDateString()
              : "None"}
          </p>
          <p className="mt-1 text-xs text-muted">most recent activity</p>
        </div>

        <div className="rounded-xl border border-app bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Pending</p>
          <p className="mt-2 text-4xl font-bold text-amber-600">{stats.pending_attestations}</p>
          <p className="mt-1 text-xs text-muted">awaiting attestation</p>
        </div>
      </div>

      {/* Placeholder for Charts */}
      <div className="rounded-xl border border-app bg-card p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl mb-4">
          📈
        </div>
        <h3 className="text-lg font-semibold text-app mb-2">Advanced Analytics Coming Soon</h3>
        <p className="text-sm text-muted">
          Charts, trends, and detailed performance breakdowns will be available in a future update
        </p>
      </div>
    </div>
  );
}
