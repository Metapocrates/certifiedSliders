// src/app/(public)/athlete/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import AthleteBestCard from "@/components/AthleteBestCard";
import ResultsTable from "@/components/ResultsTable";
import { dedupeResults } from "@/lib/results/dedupe";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const supabase = createSupabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, school_name, school_state")
    .eq("id", params.id)
    .maybeSingle();

  const title = data?.full_name ? `${data.full_name} – Certified Sliders` : "Athlete – Certified Sliders";
  const desc = data?.school_name
    ? `${data.full_name ?? "Athlete"} | ${data.school_name}${data.school_state ? ", " + data.school_state : ""}`
    : "Athlete profile";

  return { title, description: desc };
}

async function getAthleteData(athleteId: string) {
  const supabase = createSupabaseServer();

  const [profileRes, bestRes, resultsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, class_year, gender, school_name, school_state, star_rating, profile_pic_url")
      .eq("id", athleteId)
      .maybeSingle(),
    supabase
      .from("mv_best_event")
      .select("event, mark, mark_seconds_adj, wind, meet_name, meet_date, proof_url")
      .eq("athlete_id", athleteId)
      .order("mark_seconds_adj", { ascending: true, nullsFirst: false }),
    supabase
      .from("results")
      .select("id, event, mark, mark_seconds, mark_seconds_adj, timing, wind, season, meet_name, meet_date, proof_url, status, source")
      .eq("athlete_id", athleteId)
      .eq("status", "verified") // ← only VERIFIED rows
      .order("meet_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (bestRes.error) throw bestRes.error;
  if (resultsRes.error) throw resultsRes.error;

  // De-dupe same performance (event + date + adjusted-or-raw seconds)
  const verifiedDeduped = dedupeResults(resultsRes.data ?? []);

  return {
    profile: profileRes.data,
    best: bestRes.data ?? [],
    resultsVerified: verifiedDeduped,
  };
}

export default async function AthletePage({ params }: { params: Params }) {
  const { profile, best, resultsVerified } = await getAthleteData(params.id);

  if (!profile) notFound();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-4">
        {profile.profile_pic_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.profile_pic_url}
            alt={profile.full_name ?? "Athlete"}
            className="h-20 w-20 rounded-full object-cover border"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-neutral-200" />
        )}
        <div>
          <h1 className="text-2xl font-semibold">
            {profile.full_name ?? "Athlete"}
            {typeof profile.star_rating === "number" ? (
              <span className="ml-2 text-amber-500 align-middle">
                {"★".repeat(profile.star_rating)}
              </span>
            ) : null}
          </h1>
          <div className="text-sm text-muted-foreground">
            {profile.school_name ? `${profile.school_name}${profile.school_state ? ", " + profile.school_state : ""}` : "—"}
            {" · "}
            {profile.gender ?? "—"}
            {" · "}
            {profile.class_year ?? "—"}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AthleteBestCard items={best} />
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-lg font-medium mb-2">Verified Results</h2>
          <ResultsTable
            rows={resultsVerified as any} // ← satisfy ResultsTable's Row[] type for now
            bestByEvent={Object.fromEntries(
              best.map((b: { event: string; mark_seconds_adj: number | null }) => [b.event, b.mark_seconds_adj])
            )}
          />
        </div>
      </div>
    </div>
  );
}
