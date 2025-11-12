// src/app/(protected)/hs/portal/page.tsx
import "server-only";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UserTeam = {
  team_id: string;
  school_name: string;
  city: string | null;
  state: string | null;
  division: string | null;
  gender: string | null;
  logo_url: string | null;
  is_public: boolean;
  role: string;
  title: string | null;
  can_invite_athletes: boolean;
  can_manage_staff: boolean;
  can_attest_results: boolean;
  total_athletes: number;
  pending_attestations: number;
};

export default async function HSCoachPortalPage() {
  const supabase = createSupabaseServer();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/hs/portal");
  }

  // Check if user is HS coach
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();

  if (!profile || profile.user_type !== "hs_coach") {
    redirect("/me");
  }

  // Get user's teams
  const { data: teams } = await supabase.rpc("rpc_get_user_teams", {
    p_user_id: user.id,
  });

  const userTeams = (teams || []) as UserTeam[];

  // If no teams, redirect to team creation
  if (userTeams.length === 0) {
    redirect("/hs/portal/create-team");
  }

  // For MVP, show first team (multi-team support can be added later)
  const primaryTeam = userTeams[0];

  // Get analytics for primary team
  const { data: analytics } = await supabase.rpc("rpc_get_team_analytics", {
    p_team_id: primaryTeam.team_id,
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-app">High School Coach Portal</h1>
        <p className="text-muted-foreground">
          Manage your team roster, attest results, and track athlete progress
        </p>
      </div>

      {/* Team Info Card */}
      <div className="rounded-xl border border-app bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-app">{primaryTeam.school_name}</h2>
            {(primaryTeam.city || primaryTeam.state) && (
              <p className="text-sm text-muted">
                {[primaryTeam.city, primaryTeam.state].filter(Boolean).join(", ")}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {primaryTeam.division && (
                <span className="inline-flex items-center rounded-md border border-app bg-muted px-2 py-0.5 text-xs font-medium">
                  {primaryTeam.division}
                </span>
              )}
              {primaryTeam.gender && (
                <span className="inline-flex items-center rounded-md border border-app bg-muted px-2 py-0.5 text-xs font-medium">
                  {primaryTeam.gender}
                </span>
              )}
              <span className="inline-flex items-center rounded-md border border-app bg-muted px-2 py-0.5 text-xs font-medium">
                {primaryTeam.role.replace("_", " ")}
              </span>
            </div>
          </div>
          <Link
            href={`/hs/portal/settings?team=${primaryTeam.team_id}`}
            className="rounded-md px-3 py-1.5 text-sm border border-app hover:bg-muted transition"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-app bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Athletes</p>
          <p className="mt-2 text-4xl font-bold text-app">{stats.active_athletes}</p>
          <p className="mt-1 text-xs text-muted">Active on roster</p>
        </div>

        <div className="rounded-xl border border-app bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Results</p>
          <p className="mt-2 text-4xl font-bold text-app">{stats.total_results}</p>
          <p className="mt-1 text-xs text-muted">{stats.verified_results} verified</p>
        </div>

        <div className="rounded-xl border border-app bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Pending</p>
          <p className="mt-2 text-4xl font-bold text-amber-600">{stats.pending_attestations}</p>
          <p className="mt-1 text-xs text-muted">Awaiting attestation</p>
        </div>

        <div className="rounded-xl border border-app bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Last 30 Days</p>
          <p className="mt-2 text-4xl font-bold text-app">{stats.results_last_30d}</p>
          <p className="mt-1 text-xs text-muted">New results</p>
        </div>
      </div>

      {/* Alerts */}
      {(stats.pending_attestations > 0 || stats.pending_requests > 0) && (
        <div className="space-y-3">
          {stats.pending_attestations > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">⏱️</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                    {stats.pending_attestations} result{stats.pending_attestations !== 1 ? "s" : ""} awaiting attestation
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    Review and attest athlete-submitted results
                  </p>
                  <Link
                    href={`/hs/portal/attest?team=${primaryTeam.team_id}`}
                    className="inline-block mt-3 rounded-md bg-amber-900 dark:bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:hover:bg-amber-600"
                  >
                    Review Now
                  </Link>
                </div>
              </div>
            </div>
          )}

          {stats.pending_requests > 0 && (
            <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-900/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">👋</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    {stats.pending_requests} join request{stats.pending_requests !== 1 ? "s" : ""}
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    Athletes want to join your team
                  </p>
                  <Link
                    href={`/hs/portal/roster/pending?team=${primaryTeam.team_id}`}
                    className="inline-block mt-3 rounded-md bg-blue-900 dark:bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 dark:hover:bg-blue-600"
                  >
                    Review Requests
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-app">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/hs/portal/roster?team=${primaryTeam.team_id}`}
            className="flex items-center gap-3 rounded-xl border border-app bg-card px-4 py-3 transition hover:border-scarlet hover:bg-muted"
          >
            <span className="text-2xl">👥</span>
            <span className="text-sm font-semibold text-app">Manage Roster</span>
          </Link>

          <Link
            href={`/hs/portal/roster/invite?team=${primaryTeam.team_id}`}
            className="flex items-center gap-3 rounded-xl border border-app bg-card px-4 py-3 transition hover:border-scarlet hover:bg-muted"
          >
            <span className="text-2xl">✉️</span>
            <span className="text-sm font-semibold text-app">Invite Athletes</span>
          </Link>

          <Link
            href={`/hs/portal/attest?team=${primaryTeam.team_id}`}
            className="flex items-center gap-3 rounded-xl border border-app bg-card px-4 py-3 transition hover:border-scarlet hover:bg-muted"
          >
            <span className="text-2xl">✓</span>
            <span className="text-sm font-semibold text-app">Attest Results</span>
          </Link>

          <Link
            href={`/hs/portal/results?team=${primaryTeam.team_id}`}
            className="flex items-center gap-3 rounded-xl border border-app bg-card px-4 py-3 transition hover:border-scarlet hover:bg-muted"
          >
            <span className="text-2xl">📊</span>
            <span className="text-sm font-semibold text-app">View Results</span>
          </Link>

          <Link
            href={`/hs/portal/analytics?team=${primaryTeam.team_id}`}
            className="flex items-center gap-3 rounded-xl border border-app bg-card px-4 py-3 transition hover:border-scarlet hover:bg-muted"
          >
            <span className="text-2xl">📈</span>
            <span className="text-sm font-semibold text-app">Analytics</span>
          </Link>

          <Link
            href={`/team/${primaryTeam.team_id}`}
            className="flex items-center gap-3 rounded-xl border border-app bg-card px-4 py-3 transition hover:border-scarlet hover:bg-muted"
          >
            <span className="text-2xl">🔗</span>
            <span className="text-sm font-semibold text-app">Public Page</span>
          </Link>

          <Link
            href="/me/edit"
            className="flex items-center gap-3 rounded-xl border border-app bg-card px-4 py-3 transition hover:border-scarlet hover:bg-muted"
          >
            <span className="text-2xl">👤</span>
            <span className="text-sm font-semibold text-app">Edit Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
