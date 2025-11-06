// src/app/(public)/rankings/page.tsx
import { createSupabaseServer } from "@/lib/supabase/compat";
import Link from "next/link";
import type { Metadata } from "next";
import { formatGrade } from "@/lib/grade";
import { shouldIndex, getCanonicalUrl, formatRankingsMetaTitle, formatRankingsMetaDescription } from "@/lib/seo/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ searchParams }: { searchParams?: any }): Promise<Metadata> {
  const params = searchParams || {};
  const { event, classYear, gender } = params;

  const currentYear = new Date().getFullYear();
  const year = classYear || String(currentYear + 1);

  const shouldBeIndexed = shouldIndex(params);
  const baseUrl = "https://www.certifiedsliders.com/rankings";
  const preserveParams: Record<string, string> = {};

  if (event) preserveParams.event = event;
  if (classYear) preserveParams.classYear = classYear;

  const canonicalUrl = getCanonicalUrl(baseUrl, Object.keys(preserveParams).length > 0 ? preserveParams : undefined);

  const title = formatRankingsMetaTitle(year, event, gender);
  const description = formatRankingsMetaDescription(year, event, gender);

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: { index: shouldBeIndexed, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Certified Sliders",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

type PageProps = {
  searchParams?: {
    event?: string;
    classYear?: string;
    grade?: string;
    gender?: "M" | "F" | "";
    state?: string;
  };
};

type RankRow = {
  athlete_id: string;
  event: string;
  best_seconds_adj: number | null;
  best_mark_text: string | null;
  wind: number | null;
  wind_legal: boolean | null;
  meet_name: string | null;
  meet_date: string | null;
  season: "INDOOR" | "OUTDOOR" | null;
  proof_url: string | null;
  grade: number | null;
};

type ProfileLite = {
  id: string;
  username: string | null;
  profile_id: string;
  full_name: string | null;
  class_year: number | null;
  school_name: string | null;
  school_state: string | null;
  gender: "M" | "F" | null;
};

function fmtTime(sec: number | null | undefined, text?: string | null) {
  if (text) return text;
  if (sec == null) return "—";
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return mm > 0 ? `${mm}:${ss.toFixed(2).padStart(5, "0")}` : ss.toFixed(2);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

const EVENTS: string[] = [
  // Sprints
  "100m", "200m", "400m",
  // Mid/Distance
  "800m", "1600m", "1 Mile", "3200m", "2 Mile", "5000m",
  // Hurdles (adjust to your event keys)
  "110H", "100H", "300H", "400H",
  // Jumps / Throws (time column will show mark text)
  "LJ", "TJ", "HJ", "PV", "SP", "DT", "JT", "WT",
];

const STATES = [
  "", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY",
  "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH",
  "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const CLASS_YEARS = (() => {
  const now = new Date();
  const y = now.getUTCFullYear();
  // Reasonable HS range—adjust as you like
  return [y - 1, y, y + 1, y + 2, y + 3];
})();

export default async function RankingsPage({ searchParams }: PageProps) {
  const supabase = createSupabaseServer();

  const eventFilter = (searchParams?.event || "").trim();
  const classYearFilter = (searchParams?.classYear || "").trim();
  const gradeFilter = (searchParams?.grade || "").trim();
  const genderFilter = (searchParams?.gender || "").trim() as "M" | "F" | "";
  const stateFilter = (searchParams?.state || "").trim();

  // Step 1: fetch candidate profiles if any profile-based filters were provided
  let profIdsFilter: Set<string> | null = null;

  if (classYearFilter || genderFilter || stateFilter) {
    let pq = supabase
      .from("profiles")
      .select("id, username, profile_id, full_name, class_year, school_name, school_state, gender");

    if (classYearFilter) pq = pq.eq("class_year", Number(classYearFilter));
    if (genderFilter) pq = pq.eq("gender", genderFilter);
    if (stateFilter) pq = pq.eq("school_state", stateFilter);

    const { data: profs } = await pq.limit(5000);
    profIdsFilter = new Set((profs ?? []).map((p) => p.id));
  }

  // Step 2: fetch ranking rows from mv_best_event (event filter applied here)
  let rq = supabase
    .from("mv_best_event")
    .select(
      "athlete_id, event, best_seconds_adj, best_mark_text, wind, wind_legal, meet_name, meet_date, proof_url, season, grade"
    );

  if (eventFilter) rq = rq.eq("event", eventFilter);
  if (gradeFilter) rq = rq.eq("grade", Number(gradeFilter));

  // You can tune limit as needed
  const { data: rowsRaw } = await rq.order("best_seconds_adj", { ascending: true, nullsFirst: false }).limit(1000);
  let rows: RankRow[] = rowsRaw ?? [];

  // Step 3: apply profile-based filters client-side if we built a filter set
  if (profIdsFilter) {
    rows = rows.filter((r) => profIdsFilter!.has(r.athlete_id));
  }

  // Step 4: gather needed profile info for display (names, school)
  const uniqueIds = Array.from(new Set(rows.map((r) => r.athlete_id)));
  let profMap = new Map<string, ProfileLite>();
  if (uniqueIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, profile_id, full_name, class_year, school_name, school_state, gender")
      .in("id", uniqueIds)
      .limit(uniqueIds.length);
    for (const p of profs ?? []) profMap.set(p.id, p as ProfileLite);
  }

  // Step 5: render
  return (
    <div className="container py-8">
      <h1 className="mb-4 text-2xl font-semibold">Rankings</h1>

      {/* Filters (GET form, SSR-friendly) */}
      <form className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-5" method="get">
        {/* Event */}
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium">Event</span>
          <select name="event" defaultValue={eventFilter} className="rounded-lg border px-3 py-2">
            <option value="">All</option>
            {EVENTS.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
        </label>

        {/* Class Year */}
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium">Class Year</span>
          <select name="classYear" defaultValue={classYearFilter} className="rounded-lg border px-3 py-2">
            <option value="">All</option>
            {CLASS_YEARS.map((cy) => (
              <option key={cy} value={String(cy)}>
                {cy}
              </option>
            ))}
          </select>
        </label>

        {/* Grade */}
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium">Grade</span>
          <select name="grade" defaultValue={gradeFilter} className="rounded-lg border px-3 py-2">
            <option value="">All</option>
            <option value="9">Freshman</option>
            <option value="10">Sophomore</option>
            <option value="11">Junior</option>
            <option value="12">Senior</option>
          </select>
        </label>

        {/* Gender */}
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium">Gender</span>
          <select name="gender" defaultValue={genderFilter} className="rounded-lg border px-3 py-2">
            <option value="">All</option>
            <option value="M">Boys</option>
            <option value="F">Girls</option>
          </select>
        </label>

        {/* State */}
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium">State</span>
          <select name="state" defaultValue={stateFilter} className="rounded-lg border px-3 py-2">
            {STATES.map((st) => (
              <option key={st || "all"} value={st}>
                {st || "All"}
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-5 flex items-center gap-2">
          <button className="rounded-md border px-3 py-2 text-sm hover:opacity-90 bg-black text-white" type="submit">
            Apply
          </button>
          <Link
            href="/rankings"
            className="rounded-md border px-3 py-2 text-sm hover:opacity-90"
            title="Reset filters"
          >
            Reset
          </Link>
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Athlete</th>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2">Grade</th>
              <th className="px-3 py-2">School / State</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Mark</th>
              <th className="px-3 py-2">Wind</th>
              <th className="px-3 py-2">Season</th>
              <th className="px-3 py-2">Meet</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Proof</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-gray-600" colSpan={12}>
                  No results found for the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const p = profMap.get(r.athlete_id);
                const mark = fmtTime(r.best_seconds_adj, r.best_mark_text);
                const wind =
                  r.wind != null ? `${r.wind.toFixed(1)} m/s` : r.wind_legal === false ? "NWI/IL" : "—";
                const season = r.season ?? "—";
                const meet = r.meet_name ?? "—";
                const date = fmtDate(r.meet_date);
                const name = p?.full_name || p?.username || r.athlete_id.slice(0, 8);
                const school = p?.school_name || "—";
                const state = p?.school_state || "—";
                const classYear = p?.class_year ?? "—";
                const grade = formatGrade(r.grade);
                const profileHref = p?.profile_id ? `/athletes/${p.profile_id}` : undefined;

                return (
                  <tr key={`${r.athlete_id}-${r.event}-${i}`} className="border-t">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">
                      {profileHref ? (
                        <Link className="text-blue-600 hover:underline" href={profileHref}>
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                    </td>
                    <td className="px-3 py-2">{classYear}</td>
                    <td className="px-3 py-2">{grade}</td>
                    <td className="px-3 py-2">
                      {school} {state !== "—" ? `(${state})` : ""}
                    </td>
                    <td className="px-3 py-2">{r.event}</td>
                    <td className="px-3 py-2 font-medium">{mark}</td>
                    <td className="px-3 py-2">{wind}</td>
                    <td className="px-3 py-2">{season}</td>
                    <td className="px-3 py-2">{meet}</td>
                    <td className="px-3 py-2">{date}</td>
                    <td className="px-3 py-2">
                      {r.proof_url ? (
                        <a
                          className="text-blue-600 hover:underline"
                          href={r.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}