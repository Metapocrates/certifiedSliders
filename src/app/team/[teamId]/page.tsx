// src/app/team/[teamId]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

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

export default async function PublicTeamPage({
  params,
}: {
  params: { teamId: string };
}) {
  const supabase = createSupabaseServer();

  // Get team info
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", params.teamId)
    .maybeSingle();

  // If team doesn't exist or isn't public, show 404
  if (!team || !team.is_public) {
    notFound();
  }

  // Get active roster
  const { data: roster } = await supabase.rpc("rpc_get_team_roster", {
    p_team_id: params.teamId,
    p_status: "active",
  });

  const athletes = (roster || []) as RosterAthlete[];

  // Get current user to check if they're an athlete
  const { data: { user } } = await supabase.auth.getUser();

  let canRequestJoin = false;
  let hasExistingRequest = false;

  if (user) {
    // Check if user is an athlete
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.user_type === "athlete") {
      // Check if already on roster
      const { data: membership } = await supabase
        .from("team_memberships")
        .select("id")
        .eq("team_id", params.teamId)
        .eq("athlete_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      // Check if has pending request
      const { data: request } = await supabase
        .from("hs_athlete_team_requests")
        .select("id")
        .eq("team_id", params.teamId)
        .eq("athlete_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      canRequestJoin = !membership;
      hasExistingRequest = !!request;
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Team Header */}
      <div className="text-center space-y-4">
        {team.logo_url && (
          <img
            src={team.logo_url}
            alt={`${team.school_name} logo`}
            className="mx-auto h-24 w-24 rounded-full object-cover"
          />
        )}
        <div>
          <h1 className="text-4xl font-bold text-app">{team.school_name}</h1>
          <p className="text-lg text-muted mt-2">
            {[team.city, team.state].filter(Boolean).join(", ")}
          </p>
          {team.division && (
            <span className="inline-block mt-2 rounded-full border border-app bg-muted px-3 py-1 text-sm font-medium text-app">
              {team.division}
            </span>
          )}
        </div>
      </div>

      {/* Team Info */}
      {(team.contact_email || team.website_url) && (
        <div className="flex justify-center gap-6 text-sm">
          {team.contact_email && (
            <a
              href={`mailto:${team.contact_email}`}
              className="text-scarlet hover:underline"
            >
              Contact
            </a>
          )}
          {team.website_url && (
            <a
              href={team.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-scarlet hover:underline"
            >
              Website →
            </a>
          )}
        </div>
      )}

      {/* Join Request CTA */}
      {canRequestJoin && !hasExistingRequest && (
        <div className="max-w-2xl mx-auto rounded-xl border border-blue-300 bg-blue-50 dark:bg-blue-900/20 p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Interested in joining this team?
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
            Send a request to the coaching staff
          </p>
          <Link
            href={`/athletes/team-request?team=${params.teamId}`}
            className="inline-block rounded-lg bg-scarlet px-6 py-2 text-sm font-semibold text-white hover:bg-scarlet/90"
          >
            Request to Join
          </Link>
        </div>
      )}

      {hasExistingRequest && (
        <div className="max-w-2xl mx-auto rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-6 text-center">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Your join request is pending review by the coaching staff
          </p>
        </div>
      )}

      {/* Roster */}
      <div>
        <h2 className="text-2xl font-bold text-app mb-6">Roster ({athletes.length})</h2>

        {athletes.length === 0 ? (
          <div className="rounded-xl border border-app bg-card p-12 text-center">
            <p className="text-muted">No athletes on roster yet</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {athletes.map((athlete) => (
              <div
                key={athlete.athlete_id}
                className="rounded-xl border border-app bg-card p-5"
              >
                <div className="flex items-start gap-3">
                  {athlete.profile_pic_url ? (
                    <img
                      src={athlete.profile_pic_url}
                      alt={athlete.full_name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-lg font-medium text-muted-foreground">
                      {athlete.full_name.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-app truncate">{athlete.full_name}</h3>
                    {athlete.class_year && (
                      <p className="text-sm text-muted">Class of {athlete.class_year}</p>
                    )}
                    {athlete.verified_results > 0 && (
                      <p className="text-xs text-muted mt-1">
                        {athlete.verified_results} verified result{athlete.verified_results !== 1 ? "s" : ""}
                      </p>
                    )}
                    {athlete.profile_id && (
                      <Link
                        href={`/athletes/${athlete.profile_id}`}
                        className="text-xs text-scarlet hover:underline mt-2 inline-block"
                      >
                        View Profile →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
