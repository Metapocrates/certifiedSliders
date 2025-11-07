import "server-only";
import { redirect, notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import StarInline from "@/components/StarInline";
import ImageWithFallback from "@/components/ImageWithFallback";
import FlagButton from "@/components/FlagButton";

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

  // Get video clips (non-archived, non-flagged)
  const { data: videoClips } = await supabase
    .from("athlete_video_clips")
    .select("*")
    .eq("athlete_id", profile.id)
    .eq("is_archived", false)
    .is("flagged_at", null)
    .order("display_order", { ascending: true });

  const clips = videoClips || [];

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
        {athlete.bio && (athlete.bio_visibility === 'public' || athlete.bio_visibility === 'coaches') && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Bio</h3>
              <FlagButton contentType="bio" contentId={params.profileId} />
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{athlete.bio}</p>
          </div>
        )}
      </div>

      {/* Contact Info */}
      {athlete.share_contact && (athlete.email || athlete.phone) && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h2 className="text-xl font-semibold">Contact Information</h2>
          <div className="space-y-2 text-sm">
            {athlete.email && (
              <div>
                <span className="font-medium">Email:</span>{" "}
                <a href={`mailto:${athlete.email}`} className="text-blue-600 hover:underline">
                  {athlete.email}
                </a>
              </div>
            )}
            {athlete.phone && (
              <div>
                <span className="font-medium">Phone:</span>{" "}
                <a href={`tel:${athlete.phone}`} className="text-blue-600 hover:underline">
                  {athlete.phone}
                </a>
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

      {/* Academic Info */}
      {athlete.academic_shared && (athlete.gpa || athlete.sat_score || athlete.act_score) && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h2 className="text-xl font-semibold">Academic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {athlete.gpa && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">GPA</div>
                <div className="text-2xl font-bold">{athlete.gpa.toFixed(2)}</div>
              </div>
            )}
            {athlete.sat_score && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">SAT</div>
                <div className="text-2xl font-bold">{athlete.sat_score}</div>
              </div>
            )}
            {athlete.act_score && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">ACT</div>
                <div className="text-2xl font-bold">{athlete.act_score}</div>
              </div>
            )}
          </div>
          {!athlete.gpa && !athlete.sat_score && !athlete.act_score && (
            <div className="text-sm text-muted-foreground">
              Athlete has not provided academic information.
            </div>
          )}
        </div>
      )}

      {/* Video Clips */}
      {clips.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Video Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clips.map((clip: any) => (
              <div key={clip.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                {clip.youtube_id && (
                  <div className="aspect-video rounded overflow-hidden bg-muted">
                    <img
                      src={`https://img.youtube.com/vi/${clip.youtube_id}/mqdefault.jpg`}
                      alt={clip.title || "Video thumbnail"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  {clip.title && (
                    <h3 className="font-medium text-sm mb-1">{clip.title}</h3>
                  )}
                  {clip.event_code && (
                    <div className="text-xs text-muted-foreground mb-2">
                      Event: {clip.event_code}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <a
                      href={clip.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      Watch on YouTube →
                    </a>
                    <FlagButton contentType="video" contentId={clip.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
