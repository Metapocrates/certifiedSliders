import "server-only";
import { redirect, notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import StarInline from "@/components/StarInline";
import ImageWithFallback from "@/components/ImageWithFallback";

export default async function CoachAthleteDetailPage({
  params,
}: {
  params: { profileId: string };
}) {
  const supabase = createSupabaseServer();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/coach/portal");
  }

  // Get user's program memberships
  const { data: memberships } = await supabase
    .from("program_memberships")
    .select("program_id")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    redirect("/coach/onboarding");
  }

  const programIds = memberships.map((m) => m.program_id);

  // Get athlete_id from profile_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("profile_id", params.profileId)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  // Check if athlete has expressed interest in any of the coach's programs
  const { data: interest } = await supabase
    .from("athlete_college_interests")
    .select("program_id, intent")
    .eq("athlete_id", profile.id)
    .in("program_id", programIds)
    .maybeSingle();

  if (!interest) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            This athlete has not expressed interest in your program.
          </p>
          <a
            href="/coach/portal"
            className="inline-block rounded-md px-4 py-2 bg-black text-app"
          >
            Back to Portal
          </a>
        </div>
      </div>
    );
  }

  // Get athlete detail using RPC
  const { data: athleteData, error: detailError } = await supabase.rpc(
    "rpc_get_athlete_detail_for_coach",
    {
      _athlete_id: profile.id,
      _program_id: interest.program_id,
    }
  );

  if (detailError || !athleteData || athleteData.length === 0) {
    console.error("Error fetching athlete detail:", detailError);
    notFound();
  }

  const athlete = athleteData[0];

  // Get athlete results using RPC
  const { data: results } = await supabase.rpc("rpc_get_athlete_results_for_coach", {
    _athlete_id: profile.id,
    _program_id: interest.program_id,
  });

  const athleteResults = results || [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Back Button */}
      <div>
        <a
          href="/coach/portal"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Portal
        </a>
      </div>

      {/* Athlete Header */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-6">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            <ImageWithFallback
              src={athlete.profile_pic_url || ""}
              alt={athlete.full_name}
              width={120}
              height={120}
              className="rounded-lg"
            />
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-3xl font-bold">{athlete.full_name}</h1>
              {athlete.username && (
                <div className="text-sm text-muted-foreground">
                  @{athlete.username}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              {athlete.class_year && (
                <div>
                  <span className="font-medium">Class:</span> {athlete.class_year}
                </div>
              )}
              {athlete.school_name && (
                <div>
                  <span className="font-medium">School:</span> {athlete.school_name}
                  {athlete.school_state && `, ${athlete.school_state}`}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div>
                <StarInline value={athlete.star_rating} />
              </div>
              {athlete.profile_verified && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  ✓ Verified Profile
                </span>
              )}
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  athlete.intent === "commit"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {athlete.intent === "commit" ? "Committed" : "Interested"}
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {athlete.bio && (
          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium mb-2">Bio</h3>
            <p className="text-sm text-muted-foreground">{athlete.bio}</p>
          </div>
        )}
      </div>

      {/* Contact Info */}
      {athlete.share_contact && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h2 className="text-xl font-semibold">Contact Information</h2>
          <div className="space-y-2 text-sm">
            {athlete.share_email && (
              <div>
                <span className="font-medium">Email:</span>{" "}
                <span className="text-muted-foreground">
                  Contact available in full version
                </span>
              </div>
            )}
            {athlete.share_phone && (
              <div>
                <span className="font-medium">Phone:</span>{" "}
                <span className="text-muted-foreground">
                  Contact available in full version
                </span>
              </div>
            )}
            {!athlete.share_email && !athlete.share_phone && (
              <div className="text-muted-foreground">
                Athlete has not shared contact information.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interest Note */}
      {athlete.interest_note && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-medium mb-2">Note from Athlete</h3>
          <p className="text-sm text-muted-foreground">{athlete.interest_note}</p>
        </div>
      )}

      {/* Top Results */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Top Verified Results</h2>
        {athleteResults.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left">Event</th>
                  <th className="px-4 py-3 text-left">Mark</th>
                  <th className="px-4 py-3 text-left">Meet</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Wind</th>
                  <th className="px-4 py-3 text-left">Timing</th>
                  <th className="px-4 py-3 text-left">Proof</th>
                </tr>
              </thead>
              <tbody>
                {athleteResults.slice(0, 10).map((result: any, idx: number) => (
                  <tr key={idx} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{result.event}</td>
                    <td className="px-4 py-3">{result.mark || "—"}</td>
                    <td className="px-4 py-3 text-sm">{result.meet_name || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      {result.meet_date
                        ? new Date(result.meet_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {result.wind !== null
                        ? `${result.wind > 0 ? "+" : ""}${result.wind.toFixed(1)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">{result.timing || "—"}</td>
                    <td className="px-4 py-3">
                      {result.proof_url ? (
                        <a
                          href={result.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted p-8 text-center text-muted-foreground">
            No verified results found.
          </div>
        )}
      </div>

      {/* View Full Profile */}
      <div className="text-center">
        <a
          href={`/athletes/${params.profileId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-md px-6 py-3 bg-black text-app font-medium"
        >
          View Full Public Profile →
        </a>
      </div>
    </div>
  );
}
