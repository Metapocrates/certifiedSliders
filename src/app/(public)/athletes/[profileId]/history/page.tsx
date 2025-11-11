// src/app/(public)/athletes/[profileId]/history/page.tsx
import { createSupabaseServer } from "@/lib/supabase/compat";
import SafeLink from "@/components/SafeLink";
import { formatGrade } from "@/lib/grade";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: { profileId: string };
  searchParams?: {
    sort?: "date_desc" | "date_asc" | "event_asc" | "season_then_date";
  };
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

export default async function AthleteHistoryPage({ params, searchParams }: PageProps) {
  const { profileId } = params;
  const supabase = createSupabaseServer();

  // Load profile (id + basics for header)
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, username, school_name, school_state, class_year, gender"
    )
    .eq("profile_id", profileId)
    .eq("user_type", "athlete")
    .maybeSingle();

  if (!profile) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-2">Athlete History</h1>
        <p className="text-red-700">Athlete not found.</p>
      </div>
    );
  }

  // Fetch all verified results for this athlete
  const { data: results } = await supabase
    .from("results")
    .select(
      "event, mark, mark_seconds_adj, wind, season, meet_name, meet_date, proof_url, status, grade"
    )
    .eq("athlete_id", profile.id)
    .eq("status", "verified")
    .limit(2000);

  const list = (results ?? []).slice();

  // Sorting
  const sort = searchParams?.sort || "date_desc";
  list.sort((a: any, b: any) => {
    const aDate = a.meet_date ? new Date(a.meet_date).getTime() : 0;
    const bDate = b.meet_date ? new Date(b.meet_date).getTime() : 0;

    switch (sort) {
      case "date_asc":
        return aDate - bDate;
      case "event_asc": {
        const ev = (a.event || "").localeCompare(b.event || "");
        if (ev !== 0) return ev;
        return bDate - aDate; // newer first within event
      }
      case "season_then_date": {
        const sa = a.season || "";
        const sb = b.season || "";
        const sCmp = sa.localeCompare(sb);
        if (sCmp !== 0) return sCmp;
        return bDate - aDate;
      }
      case "date_desc":
      default:
        return bDate - aDate;
    }
  });

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          {profile.full_name ?? profile.username} – History
        </h1>
        <p className="text-sm text-gray-500">
          {profile.school_name
            ? `${profile.school_name}${profile.school_state ? `, ${profile.school_state}` : ""}`
            : "—"}{" "}
          • {profile.class_year ?? "—"} •{" "}
          {profile.gender === "M" ? "Boys" : profile.gender === "F" ? "Girls" : "—"}
        </p>
      </div>

      {/* Sort controls */}
      <form className="mb-4 flex flex-wrap items-center gap-2" method="get">
        <label className="text-sm">
          <span className="mr-2 font-medium">Sort:</span>
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="event_asc">Event (A→Z)</option>
            <option value="season_then_date">Season → Newest</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border px-3 py-2 text-sm hover:opacity-90 bg-black text-white"
        >
          Apply
        </button>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Mark</th>
              <th className="px-3 py-2">Wind</th>
              <th className="px-3 py-2">Grade</th>
              <th className="px-3 py-2">Season</th>
              <th className="px-3 py-2">Meet</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Proof</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-gray-600" colSpan={8}>
                  No verified results yet.
                </td>
              </tr>
            ) : (
              list.map((r: any, i: number) => {
                const mark = fmtTime(r.mark_seconds_adj, r.mark);
                const wind =
                  r.wind != null ? `${Number(r.wind).toFixed(1)} m/s` : "—";
                const grade = formatGrade(r.grade);
                const season = r.season ?? "—";
                const meet = r.meet_name ?? "—";
                const date = fmtDate(r.meet_date);

                return (
                  <tr key={`${r.event}-${r.meet_date}-${i}`} className="border-t">
                    <td className="px-3 py-2">{r.event || "—"}</td>
                    <td className="px-3 py-2 font-medium">{mark}</td>
                    <td className="px-3 py-2">{wind}</td>
                    <td className="px-3 py-2">{grade}</td>
                    <td className="px-3 py-2">{season}</td>
                    <td className="px-3 py-2">{meet}</td>
                    <td className="px-3 py-2">{date}</td>
                    <td className="px-3 py-2">
                      <SafeLink
                        href={r.proof_url}
                        className="text-blue-600 underline"
                        target="_blank"
                        fallback="—"
                      >
                        View
                      </SafeLink>
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