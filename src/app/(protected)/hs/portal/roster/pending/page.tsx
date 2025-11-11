// src/app/(protected)/hs/portal/roster/pending/page.tsx
import "server-only";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import PendingInvitesTable from "@/components/hs-portal/PendingInvitesTable";
import PendingRequestsTable from "@/components/hs-portal/PendingRequestsTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PendingInvite = {
  invite_id: string;
  athlete_id: string;
  athlete_name: string;
  athlete_username: string | null;
  athlete_profile_id: string | null;
  inviter_name: string | null;
  message: string | null;
  created_at: string;
  expires_at: string;
};

type PendingRequest = {
  request_id: string;
  athlete_id: string;
  athlete_name: string;
  athlete_username: string | null;
  athlete_profile_id: string | null;
  athlete_school: string | null;
  athlete_class_year: number | null;
  message: string | null;
  created_at: string;
};

export default async function PendingPage({
  searchParams,
}: {
  searchParams?: { team?: string };
}) {
  const supabase = createSupabaseServer();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/hs/portal/roster/pending");
  }

  const teamId = searchParams?.team;
  if (!teamId) {
    redirect("/hs/portal");
  }

  // Verify user is staff
  const { data: staffRecord } = await supabase
    .from("team_staff")
    .select("id, can_invite_athletes")
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

  // Get pending invites
  const { data: invites } = await supabase.rpc("rpc_get_team_pending_invites", {
    p_team_id: teamId,
  });

  // Get pending requests
  const { data: requests } = await supabase.rpc("rpc_get_team_pending_requests", {
    p_team_id: teamId,
  });

  const pendingInvites = (invites || []) as PendingInvite[];
  const pendingRequests = (requests || []) as PendingRequest[];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link href={`/hs/portal/roster?team=${teamId}`} className="text-muted hover:text-app">
            ← Back to Roster
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-app">Pending Invites & Requests</h1>
        {team && (
          <p className="text-muted-foreground">
            Manage outgoing invitations and incoming join requests for {team.school_name}
          </p>
        )}
      </div>

      {/* Join Requests Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-app">Join Requests</h2>
            <p className="text-sm text-muted">Athletes requesting to join your team</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-sm font-medium text-amber-800 dark:text-amber-200">
            {pendingRequests.length} pending
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="rounded-xl border border-app bg-card p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl mb-4">
              👋
            </div>
            <h3 className="text-lg font-semibold text-app mb-2">No Pending Requests</h3>
            <p className="text-sm text-muted">
              You&apos;ll see requests here when athletes want to join your team
            </p>
          </div>
        ) : (
          <PendingRequestsTable requests={pendingRequests} teamId={teamId} />
        )}
      </section>

      {/* Sent Invites Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-app">Sent Invitations</h2>
            <p className="text-sm text-muted">Athletes you&apos;ve invited to join</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-sm font-medium text-blue-800 dark:text-blue-200">
            {pendingInvites.length} pending
          </span>
        </div>

        {pendingInvites.length === 0 ? (
          <div className="rounded-xl border border-app bg-card p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl mb-4">
              ✉️
            </div>
            <h3 className="text-lg font-semibold text-app mb-2">No Pending Invitations</h3>
            <p className="text-sm text-muted mb-6">
              Invite athletes to join your roster
            </p>
            {staffRecord.can_invite_athletes && (
              <Link
                href={`/hs/portal/roster/invite?team=${teamId}`}
                className="inline-block rounded-lg bg-scarlet px-4 py-2 text-sm font-semibold text-white hover:bg-scarlet/90"
              >
                Invite Athletes
              </Link>
            )}
          </div>
        ) : (
          <PendingInvitesTable invites={pendingInvites} teamId={teamId} />
        )}
      </section>
    </div>
  );
}
