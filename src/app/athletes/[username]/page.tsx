// src/app/athletes/[username]/page.tsx
import "server-only";
import { notFound } from "next/navigation";
import { supabaseServer } from "../../../lib/supabase/server";

export const revalidate = 60;

// ---- Types
interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  class_year: number | null;
  gender: string | null;
  school_name: string | null;
  school_state: string | null;
  bio: string | null;
  profile_pic_url: string | null;
  star_rating: number | null; // NULL = Unrated; otherwise 3,4,5
  college_interests: string[] | null;
}

interface MVBestEvent {
  athlete_id: string;
  event: string;
  mark: string | null;
  mark_seconds: number | null;
  mark_seconds_adj: number | null;
  mark_metric: boolean | null;
  wind: number | null;
  season: string | null;
  meet_name: string | null;
  meet_date: string | null;
  proof_url: string | null;
}

interface ResultRow {
  id: string;
  athlete_id: string;
  event: string;
  mark: string | null;
  mark_seconds: number | null;
  mark_seconds_adj: number | null;
  mark_metric: boolean | null;
  timing: string | null;
  wind: number | null;
  season: string | null;
  status: string | null;
  source: string | null;
  proof_url: string | null;
  meet_name: string | null;
  meet_date: string | null;
  created_at: string | null;
}

// ---- helpers
function initials(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

function formatWind(w: number | null): string {
  if (w === null || w === undefined) return "";
  const sign = w >= 0 ? "+" : "";
  return `${sign}${w.toFixed(1)} m/s`;
}

function formatMark(row: { mark: string | null; mark_seconds_adj: number | null }): string {
  if (row.mark && row.mark.trim().length > 0) return row.mark;
  if (row.mark_seconds_adj != null) {
    const t = row.mark_seconds_adj;
    if (t >= 60) {
      const m = Math.floor(t / 60);
      const s = (t - m * 60).toFixed(2).padStart(5, "0");
      return `${m}:${s}`;
    }
    return t.toFixed(2);
  }
  return "—";
}

// ---- star tier helper
function starTier(
  n: number | null | undefined
): { label: "Unrated" | "3★" | "4★" | "5★"; classes: string; isRated: boolean } {
  if (n === 5) return { label: "5★", classes: "bg-yellow-100 text-yellow-800 border-yellow-300", isRated: true };
  if (n === 4) return { label: "4★", classes: "bg-gray-200 text-gray-800 border-gray-400", isRated: true };
  if (n === 3) return { label: "3★", classes: "bg-amber-200 text-amber-900 border-amber-400", isRated: true };
  return { label: "Unrated", classes: "bg-gray-100 text-gray-500 border-gray-300", isRated: false };
}

// ---- metadata
export async function generateMetadata({ params }: { params: { username: string } }) {
  const supabase = supabaseServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, school_name, school_state")
    .eq("username", params.username)
    .maybeSingle();

  const title = profile?.full_name
    ? `${profile.full_name} — Certified Sliders`
    : "Athlete — Certified Sliders";
  const description = profile?.school_name
    ? `${profile.full_name ?? "Athlete"} • ${profile.school_name}${
        profile.school_state ? ", " + profile.school_state : ""
      }`
    : "Athlete profile and verified results";

  return { title, description };
}

// ---- page
export default async function AthletePage({ params }: { params: { username: string } }) {
  const supabase = supabaseServer();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      [
        "id",
        "username",
        "full_name",
        "class_year",
        "gender",
        "school_name",
        "school_state",
        "bio",
        "profile_pic_url",
        "star_rating",
        "college_interests",
      ].join(",")
    )
    .eq("username", params.username)
    .maybeSingle<Profile>();

  if (!profile) return notFound();

  const [prsRes, resultsRes] = await Promise.all([
    supabase
      .from("mv_best_event")
      .select(
        [
          "athlete_id",
          "event",
          "mark",
          "mark_seconds",
          "mark_seconds_adj",
          "mark_metric",
          "wind",
          "season",
          "meet_name",
          "meet_date",
          "proof_url",
        ].join(",")
      )
      .eq("athlete_id", profile.id)
      .order("event", { ascending: true })
      .returns<MVBestEvent[]>(),
    supabase
      .from("results")
      .select(
        [
          "id",
          "athlete_id",
          "event",
          "mark",
          "mark_seconds",
          "mark_seconds_adj",
          "mark_metric",
          "timing",
          "wind",
          "season",
          "status",
          "source",
          "proof_url",
          "meet_name",
          "meet_date",
          "created_at",
        ].join(",")
      )
      .eq("athlete_id", profile.id)
      .order("meet_date", { ascending: false })
      .returns<ResultRow[]>(),
  ]);

  const prs: MVBestEvent[] = (prsRes.data as MVBestEvent[]) || [];
  const resultsAll: ResultRow[] = (resultsRes.data as ResultRow[]) || [];
  const results: ResultRow[] = resultsAll.filter(
    (r: ResultRow) => (r.status || "").toLowerCase() === "verified"
  );

  const groupedBySeason: Record<string, ResultRow[]> = results.reduce(
    (acc: Record<string, ResultRow[]>, r: ResultRow) => {
      const key = (r.season || "").toUpperCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    },
    {}
  );
  const seasons: string[] = Object.keys(groupedBySeason).sort((a: string, b: string) =>
    a < b ? 1 : -1
  );

  const tier = starTier(profile.star_rating);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {profile.profile_pic_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profile_pic_url}
              alt={profile.full_name || "Athlete"}
              className="h-20 w-20 rounded-2xl object-cover shadow"
            />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-gray-200 text-gray-700 grid place-items-center text-2xl font-semibold shadow">
              {initials(profile.full_name) || "A"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold leading-tight">
              {profile.full_name || profile.username || "Athlete"}
            </h1>
            <div className="text-sm text-gray-600">
              {[profile.school_name, profile.school_state].filter(Boolean).join(", ")}
              {profile.class_year ? ` • Class of ${profile.class_year}` : ""}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {tier.isRated ? "Verified rating • admin-assigned" : "Unrated • awaiting evaluation"}
            </p>
            {profile.bio ? <p className="mt-1 text-sm text-gray-700">{profile.bio}</p> : null}
            {Array.isArray(profile.college_interests) && profile.college_interests.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.college_interests.map((c: string) => (
                  <span key={c} className="rounded-full border px-2 py-0.5 text-xs text-gray-600">
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* star tier badge */}
        <div
          className={[
            "self-start inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold",
            tier.classes,
          ].join(" ")}
        >
          {tier.label}
          {tier.isRated && <span className="ml-1">Recruit</span>}
        </div>
      </div>

      {/* PRs */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Personal Bests</h2>
        {prs.length === 0 ? (
          <div className="rounded-xl border p-4 text-sm text-gray-600">No verified PRs yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2">Event</th>
                  <th className="px-4 py-2">Mark</th>
                  <th className="px-4 py-2">Wind</th>
                  <th className="px-4 py-2">Season</th>
                  <th className="px-4 py-2">Meet</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {prs.map((r: MVBestEvent) => (
                  <tr key={`${r.event}-${r.meet_date}-${r.meet_name}`} className="border-t">
                    <td className="px-4 py-2 font-medium">{r.event}</td>
                    <td className="px-4 py-2">{formatMark(r)}</td>
                    <td className="px-4 py-2">{formatWind(r.wind)}</td>
                    <td className="px-4 py-2">{r.season || ""}</td>
                    <td className="px-4 py-2">
                      {r.proof_url ? (
                        <a
                          className="underline hover:no-underline"
                          href={r.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {r.meet_name || "Proof"}
                        </a>
                      ) : (
                        r.meet_name || "—"
                      )}
                    </td>
                    <td className="px-4 py-2">{formatDate(r.meet_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Results */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Season Results</h2>
        {seasons.length === 0 ? (
          <div className="rounded-xl border p-4 text-sm text-gray-600">
            No verified results to show.
          </div>
        ) : (
          <div className="space-y-4">
            {seasons.map((seasonKey: string) => {
              const rows: ResultRow[] = groupedBySeason[seasonKey] || [];
              return (
                <details key={seasonKey} className="rounded-xl border" open>
                  <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
                    {seasonKey} • {rows.length} result{rows.length === 1 ? "" : "s"}
                  </summary>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-left">
                        <tr>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Event</th>
                          <th className="px-4 py-2">Mark</th>
                          <th className="px-4 py-2">Wind</th>
                          <th className="px-4 py-2">Timing</th>
                          <th className="px-4 py-2">Meet</th>
                          <th className="px-4 py-2">Proof</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r: ResultRow) => (
                          <tr key={r.id} className="border-t">
                            <td className="px-4 py-2 whitespace-nowrap">
                              {formatDate(r.meet_date)}
                            </td>
                            <td className="px-4 py-2">{r.event}</td>
                            <td className="px-4 py-2">{formatMark(r)}</td>
                            <td className="px-4 py-2">{formatWind(r.wind)}</td>
                            <td className="px-4 py-2">{r.timing || ""}</td>
                            <td className="px-4 py-2">{r.meet_name || "—"}</td>
                            <td className="px-4 py-2">
                              {r.proof_url ? (
                                <a
                                  className="underline hover:no-underline"
                                  href={r.proof_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Link
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
