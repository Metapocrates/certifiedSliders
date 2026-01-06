import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import CoachPortalTable from "@/components/coach/CoachPortalTable";
import CoachPortalFilters from "@/components/coach/CoachPortalFilters";
import CoachDashboardCards from "@/components/coach/CoachDashboardCards";

export default async function CoachPortalPage({
  searchParams,
}: {
  searchParams?: Promise<{
    program?: string;
    classYear?: string;
    event?: string;
    state?: string;
    verified?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServer();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/coach/portal");
  }

  // Check user type - only NCAA coaches can access coach portal
  const { data: canAccess } = await supabase.rpc("can_access_coach_portal");
  if (!canAccess) {
    redirect("/me"); // Redirect to dashboard with error message
  }

  // Get user's program memberships
  const { data: memberships } = await supabase
    .from("program_memberships")
    .select("id, program_id, programs(id, name, short_name)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    redirect("/coach/onboarding");
  }

  // Determine active program (from URL or default to first)
  const programParam = resolvedSearchParams?.program;
  const activeMembership = programParam
    ? memberships.find((m) => m.program_id === programParam)
    : memberships[0];

  if (!activeMembership) {
    redirect("/coach/portal");
  }

  // Get verification status for active program
  const { data: verificationData } = await supabase.rpc(
    "rpc_get_coach_verification_status",
    {
      _user_id: user.id,
      _program_id: activeMembership.program_id,
    }
  );

  const verification = verificationData?.[0] || null;
  const tier = verification?.tier ?? 0;

  // Parse filters
  const classYear = resolvedSearchParams?.classYear ? parseInt(resolvedSearchParams.classYear, 10) : undefined;
  const event = resolvedSearchParams?.event || undefined;
  const state = resolvedSearchParams?.state || undefined;
  const verified = resolvedSearchParams?.verified === "true";
  const search = resolvedSearchParams?.search || undefined;
  const page = resolvedSearchParams?.page ? parseInt(resolvedSearchParams.page, 10) : 1;
  const perPage = 50;
  const offset = (page - 1) * perPage;

  // Call RPC to get interested athletes
  const { data: athletes, error } = await supabase.rpc("rpc_list_interested_athletes", {
    _program_id: activeMembership.program_id,
    _class_year: classYear || null,
    _event_code: event || null,
    _state_code: state || null,
    _only_verified: verified,
    _search_name: search || null,
    _limit: perPage,
    _offset: offset,
  });

  if (error) {
    console.error("Error fetching interested athletes:", error);
  }

  const athletesList = athletes || [];

  // Get watchlist count and IDs for current coach
  const { data: watchlistData } = await supabase
    .from("coach_watchlist")
    .select("athlete_profile_id")
    .eq("coach_user_id", user.id);

  const watchlistCount = watchlistData?.length || 0;
  const watchlistIds = new Set((watchlistData || []).map((w) => w.athlete_profile_id));

  // Get coach interest status for listed athletes
  const athleteProfileIds = athletesList.map((a: { profile_id: string }) => a.profile_id);
  let interestStatus: Record<string, string> = {};
  if (athleteProfileIds.length > 0) {
    const { data: interestData } = await supabase
      .from("coach_interest")
      .select("athlete_profile_id, status")
      .eq("coach_user_id", user.id)
      .in("athlete_profile_id", athleteProfileIds);

    if (interestData) {
      interestData.forEach((i) => {
        interestStatus[i.athlete_profile_id] = i.status;
      });
    }
  }

  // Get all programs for dropdown
  const programs = memberships.map((m) => ({
    id: m.program_id,
    // @ts-ignore - programs relation is present
    name: m.programs?.name || "Unknown Program",
  }));

  const activeProgram = programs.find((p) => p.id === activeMembership.program_id);

  // Tier info for display
  const TIER_INFO = {
    0: { name: "Limited Access", color: "text-gray-600", bgColor: "bg-gray-100" },
    1: { name: "Verified Coach", color: "text-blue-600", bgColor: "bg-blue-100" },
    2: { name: "Coordinator", color: "text-purple-600", bgColor: "bg-purple-100" },
  } as const;

  const tierInfo = TIER_INFO[tier as keyof typeof TIER_INFO] || TIER_INFO[0];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Verification Prompt for Tier 0 */}
      {tier === 0 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">Limited Access</h3>
              <p className="text-sm text-yellow-800 mt-1">
                Your account has limited access. Verify your affiliation to unlock full features including athlete contact information.
              </p>
              <a
                href="/coach/verify"
                className="inline-block mt-3 rounded-md bg-yellow-900 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-800"
              >
                Verify My Account
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            View athletes who have expressed interest in your program
          </p>
        </div>
      </div>

      {/* Dashboard Summary Cards */}
      <CoachDashboardCards
        athleteCount={athletesList.length}
        watchlistCount={watchlistCount}
        programName={activeProgram?.name || "Your Program"}
        tier={tier}
      />

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <a
            href="/coach/portal"
            className="border-b-2 border-app px-1 py-4 text-sm font-medium text-app"
          >
            Athletes
          </a>
          <a
            href={`/coach/portal/analytics${activeMembership.program_id ? `?program=${activeMembership.program_id}` : ""}`}
            className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
          >
            Analytics {tier < 1 && <span className="ml-1 text-xs text-purple-600">Premium</span>}
          </a>
        </nav>
      </div>

      {/* Program Switcher */}
      {programs.length > 1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Active Program</label>
          <select
            className="border rounded-md px-3 py-2 max-w-md"
            value={activeMembership.program_id}
            onChange={(e) => {
              const newProgramId = e.target.value;
              const params = new URLSearchParams(resolvedSearchParams);
              params.set("program", newProgramId);
              window.location.href = `/coach/portal?${params.toString()}`;
            }}
          >
            {programs.map((prog) => (
              <option key={prog.id} value={prog.id}>
                {prog.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Active Program Display */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium text-muted-foreground">Viewing</div>
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold">{activeProgram?.name}</div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tierInfo.color} ${tierInfo.bgColor}`}>
            {tierInfo.name}
          </span>
        </div>
        {verification && (
          <div className="mt-2 text-sm text-muted-foreground">
            Verification Score: {verification.score}/100
          </div>
        )}
      </div>

      {/* Filters */}
      <CoachPortalFilters
        initial={{
          classYear: resolvedSearchParams?.classYear || "",
          event: resolvedSearchParams?.event || "",
          state: resolvedSearchParams?.state || "",
          verified: resolvedSearchParams?.verified === "true",
          search: resolvedSearchParams?.search || "",
        }}
      />

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {athletesList.length} athlete{athletesList.length !== 1 ? "s" : ""} found
        </div>
        <div className="flex gap-2">
          {tier === 0 ? (
            <div className="relative group">
              <button
                disabled
                className="rounded-md px-4 py-2 bg-gray-300 text-gray-500 text-sm cursor-not-allowed"
              >
                Export CSV
              </button>
              <div className="absolute right-0 top-full mt-2 w-64 rounded-md bg-gray-900 text-white text-xs p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                CSV export requires verification. Please verify your account to unlock this feature.
              </div>
            </div>
          ) : (
            <form action="/api/coach/export-csv" method="POST">
              <input type="hidden" name="program_id" value={activeMembership.program_id} />
              <input type="hidden" name="class_year" value={classYear || ""} />
              <input type="hidden" name="event" value={event || ""} />
              <input type="hidden" name="state" value={state || ""} />
              <input type="hidden" name="verified" value={verified ? "true" : "false"} />
              <input type="hidden" name="search" value={search || ""} />
              <button
                type="submit"
                className="rounded-md px-4 py-2 bg-black text-app text-sm"
              >
                Export CSV
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Athletes Table */}
      <CoachPortalTable
        athletes={athletesList}
        watchlistIds={Array.from(watchlistIds)}
        programId={activeMembership.program_id}
        programName={activeProgram?.name || "Your Program"}
        interestStatus={interestStatus}
      />

      {/* Pagination */}
      {athletesList.length >= perPage && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`/coach/portal?${new URLSearchParams({
                ...resolvedSearchParams,
                page: (page - 1).toString(),
              }).toString()}`}
              className="rounded-md px-4 py-2 border"
            >
              Previous
            </a>
          )}
          <span className="rounded-md px-4 py-2 border bg-muted">Page {page}</span>
          {athletesList.length === perPage && (
            <a
              href={`/coach/portal?${new URLSearchParams({
                ...resolvedSearchParams,
                page: (page + 1).toString(),
              }).toString()}`}
              className="rounded-md px-4 py-2 border"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
