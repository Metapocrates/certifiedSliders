// src/app/(protected)/hs/portal/roster/invite/page.tsx
import "server-only";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import InviteAthleteSearch from "@/components/hs-portal/InviteAthleteSearch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InviteAthletePage({
  searchParams,
}: {
  searchParams?: { team?: string };
}) {
  const supabase = createSupabaseServer();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/hs/portal/roster/invite");
  }

  const teamId = searchParams?.team;
  if (!teamId) {
    redirect("/hs/portal");
  }

  // Verify user has permission to invite athletes
  const { data: staffRecord } = await supabase
    .from("team_staff")
    .select("id, can_invite_athletes")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!staffRecord || !staffRecord.can_invite_athletes) {
    redirect("/hs/portal");
  }

  // Get team info
  const { data: team } = await supabase
    .from("teams")
    .select("school_name")
    .eq("id", teamId)
    .single();

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link href={`/hs/portal/roster?team=${teamId}`} className="text-muted hover:text-app">
            ← Back to Roster
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-app">Invite Athletes</h1>
        {team && (
          <p className="text-muted-foreground">
            Search for athletes to invite to {team.school_name}
          </p>
        )}
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-900/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">ℹ️</div>
          <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
            <p className="font-semibold mb-1">How athlete invitations work</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
              <li>Search for athletes by name, username, or profile ID</li>
              <li>Send invitations to athletes who aren't already on your roster</li>
              <li>Athletes have 14 days to accept or decline</li>
              <li>You can send up to 10 invitations per 24 hours</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Search Component */}
      <InviteAthleteSearch teamId={teamId} />
    </div>
  );
}
