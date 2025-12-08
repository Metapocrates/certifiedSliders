// src/app/(protected)/hs/portal/roster/page.tsx
import "server-only";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import RosterTable from "@/components/hs-portal/RosterTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RosterAthlete = {
  athlete_id: string;
  full_name: string;
  username: string | null;
  profile_id: string | null;
  school_name: string | null;
  class_year: number | null;
  gender: string | null;
  profile_pic_url: string | null;
  jersey_number: string | null;
  specialty_events: string[] | null;
  joined_at: string;
  status: string;
  total_results: number;
  verified_results: number;
  last_result_date: string | null;
};

export default async function RosterPage({
  searchParams,
}: {
  searchParams?: Promise<{ team?: string; status?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServer();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/hs/portal/roster");
  }

  const teamId = resolvedSearchParams?.team;
  if (!teamId) {
    redirect("/hs/portal");
  }

  // Verify user is staff on this team
  const { data: staffRecord } = await supabase
    .from("team_staff")
    .select("id, role, can_invite_athletes")
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
    .select("school_name, city, state")
    .eq("id", teamId)
    .single();

  // Get roster
  const status = resolvedSearchParams?.status || "active";
  const { data: roster } = await supabase.rpc("rpc_get_team_roster", {
    p_team_id: teamId,
    p_status: status,
  });

  const athletes = (roster || []) as RosterAthlete[];

  // Get pending counts
  const { data: pendingCounts } = await supabase.rpc("rpc_get_team_analytics", {
    p_team_id: teamId,
  });

  const pending = pendingCounts?.[0] || { pending_invites: 0, pending_requests: 0 };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link href="/hs/portal" className="text-muted hover:text-app">
              ← Back to Portal
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-app">Team Roster</h1>
          {team && (
            <p className="text-muted-foreground">
              {team.school_name} · {athletes.length} athlete{athletes.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {staffRecord.can_invite_athletes && (
            <Link
              href={`/hs/portal/roster/invite?team=${teamId}`}
              className="rounded-lg bg-scarlet px-4 py-2 text-sm font-semibold text-white transition hover:bg-scarlet/90"
            >
              Invite Athletes
            </Link>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-4 border-b border-app">
        <Link
          href={`/hs/portal/roster?team=${teamId}&status=active`}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
            status === "active"
              ? "border-scarlet text-app"
              : "border-transparent text-muted hover:text-app"
          }`}
        >
          Active
        </Link>
        <Link
          href={`/hs/portal/roster?team=${teamId}&status=alumni`}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
            status === "alumni"
              ? "border-scarlet text-app"
              : "border-transparent text-muted hover:text-app"
          }`}
        >
          Alumni
        </Link>
        <Link
          href={`/hs/portal/roster/pending?team=${teamId}`}
          className="pb-3 px-1 text-sm font-medium border-b-2 border-transparent text-muted hover:text-app transition relative"
        >
          Pending
          {(pending.pending_invites > 0 || pending.pending_requests > 0) && (
            <span className="absolute -top-1 -right-4 inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {pending.pending_invites + pending.pending_requests}
            </span>
          )}
        </Link>
      </div>

      {/* Empty State */}
      {athletes.length === 0 && (
        <div className="rounded-xl border border-app bg-card p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl mb-4">
            👥
          </div>
          <h3 className="text-lg font-semibold text-app mb-2">No Athletes Yet</h3>
          <p className="text-sm text-muted mb-6">
            {status === "active"
              ? "Start building your roster by inviting athletes"
              : "No alumni or transferred athletes"}
          </p>
          {status === "active" && staffRecord.can_invite_athletes && (
            <Link
              href={`/hs/portal/roster/invite?team=${teamId}`}
              className="inline-block rounded-lg bg-scarlet px-4 py-2 text-sm font-semibold text-white hover:bg-scarlet/90"
            >
              Invite Your First Athlete
            </Link>
          )}
        </div>
      )}

      {/* Roster Table */}
      {athletes.length > 0 && (
        <RosterTable athletes={athletes} teamId={teamId} />
      )}
    </div>
  );
}
