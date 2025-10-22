// src/app/(public)/rankings/page.tsx
import Image from "next/image";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: {
    event?: string;
    gender?: "M" | "F";
    season?: "indoor" | "outdoor";
    classYear?: string; // e.g., "2028"
    state?: string; // 2-letter
    limit?: string; // e.g., "50"
    // keyset cursor
    cursorSec?: string; // number as string
    cursorId?: string; // athlete id
  };
};

// Helper: format time from seconds
function fmtTime(sec: number | null | undefined) {
  if (sec == null) return "—";
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return mm > 0 ? `${mm}:${ss.toFixed(2).padStart(5, "0")}` : ss.toFixed(2);
}

// Build URL with new query params
function buildHref(params: URLSearchParams, patch: Record<string, string | undefined | null>) {
  const next = new URLSearchParams(params.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === "") next.delete(k);
    else next.set(k, v);
  }
  return `?${next.toString()}`;
}

export default async function RankingsPage({ searchParams }: PageProps) {
  const supabase = createSupabaseServer();

  // Read filters
  const event = (searchParams.event ?? "").trim();
  const gender = (searchParams.gender as "M" | "F" | undefined) ?? undefined;
  const season = (searchParams.season as "indoor" | "outdoor" | undefined) ?? undefined;
  const classYear = (searchParams.classYear ?? "").trim();
  const state = (searchParams.state ?? "").trim().toUpperCase();
  const limit = Math.min(Math.max(parseInt(searchParams.limit ?? "50", 10) || 50, 10), 200);

  // Keyset cursor (ascending by time)
  const cursorSec = searchParams.cursorSec ? Number(searchParams.cursorSec) : undefined;
  const cursorId = searchParams.cursorId ?? undefined;

  // Base query to mv_best_event
  let q = supabase
    .from("mv_best_event")
    .select(
      // selecting conservative set that is known to exist
      "athlete_id, event, best_seconds_adj, wind, wind_legal, meet_name, meet_date, season"
    )
    .order("best_seconds_adj", { ascending: true, nullsFirst: false })
    .order("athlete_id", { ascending: true });

  if (event) q = q.eq("event", event);
  if (season) q = q.eq("season", season.toUpperCase()); // mv likely stores OUTDOOR/INDOOR
  // Apply keyset cursor if present
  if (cursorSec != null && !Number.isNaN(cursorSec)) {
    // We need rows with (time, id) > (cursorSec, cursorId) in our sort
    // Supabase doesn't support tuple compare; emulate:
    // (best_seconds_adj > cursorSec) OR (best_seconds_adj = cursorSec AND athlete_id > cursorId)
    if (cursorId) {
      q = q.or(
        `best_seconds_adj.gt.${cursorSec},and(best_seconds_adj.eq.${cursorSec},athlete_id.gt.${cursorId})`,
        { referencedTable: "mv_best_event" }
      );
    } else {
      q = q.gt("best_seconds_adj", cursorSec);
    }
  }

  // Execute base fetch
  const { data: baseRows, error: baseErr } = await q.limit(limit);
  if (baseErr) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-2">Rankings</h1>
        <p className="text-red-700 text-sm">Error: {baseErr.message}</p>
      </div>
    );
  }
  const rows = baseRows ?? [];

  // Fetch profiles for displayed athletes, then filter by gender/class/state if requested
  const ids = Array.from(new Set(rows.map(r => r.athlete_id))).filter(Boolean);
  let profiles: Array<{
    id: string;
    full_name: string | null;
    username: string | null;
    school_name: string | null;
    school_state: string | null;
    class_year: number | null;
    gender: "M" | "F" | null;
    profile_pic_url: string | null;
  }> = [];

  if (ids.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, username, school_name, school_state, class_year, gender, profile_pic_url")
      .in("id", ids);

    profiles = (profs ?? []).filter(p => {
      if (gender && p.gender !== gender) return false;
      if (classYear && String(p.class_year ?? "") !== classYear) return false;
      if (state && (p.school_state ?? "").toUpperCase() !== state) return false;
      return true;
    });
  }

  // Build a map for quick lookup
  const profMap = new Map(profiles.map(p => [p.id, p]));

  // Apply post-filter to rows based on filtered profiles (so rows and profiles align)
  const filteredRows = rows.filter(r => profMap.has(r.athlete_id));

  // Compute next cursor from the last visible row
  const last = filteredRows.at(-1);
  const nextCursorSec =
    last && typeof last.best_seconds_adj === "number" ? String(last.best_seconds_adj) : undefined;
  const nextCursorId = last?.athlete_id;

  // Build a minimal set of options (could later hydrate from DB)
  const eventOptions = Array.from(new Set(rows.map(r => r.event))).sort();
  const yearOptions = ["2026", "2027", "2028", "2029", "2030"];
  const stateOptions = [
    "",
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA",
    "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR",
    "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"
  ];

  // Reconstruct URLSearchParams for control links
  const currentParams = new URLSearchParams();
  if (event) currentParams.set("event", event);
  if (gender) currentParams.set("gender", gender);
  if (season) currentParams.set("season", season);
  if (classYear) currentParams.set("classYear", classYear);
  if (state) currentParams.set("state", state);
  currentParams.set("limit", String(limit));

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-semibold mb-4">Rankings</h1>

      {/* Filters */}
      <form className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3" method="GET">
        <select
          name="event"
          className="rounded-lg border px-3 py-2"
          defaultValue={event}
        >
          <option value="">All events</option>
          {eventOptions.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        <select
          name="gender"
          className="rounded-lg border px-3 py-2"
          defaultValue={gender ?? ""}
        >
          <option value="">All genders</option>
          <option value="M">Boys</option>
          <option value="F">Girls</option>
        </select>

        <select
          name="season"
          className="rounded-lg border px-3 py-2"
          defaultValue={season ?? ""}
        >
          <option value="">All seasons</option>
          <option value="outdoor">Outdoor</option>
          <option value="indoor">Indoor</option>
        </select>

        <select
          name="classYear"
          className="rounded-lg border px-3 py-2"
          defaultValue={classYear}
        >
          <option value="">All classes</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          name="state"
          className="rounded-lg border px-3 py-2"
          defaultValue={state}
        >
          {stateOptions.map((s) => (
            <option key={s || "ALL"} value={s}>
              {s ? s : "All states"}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <select
            name="limit"
            className="rounded-lg border px-3 py-2"
            defaultValue={String(limit)}
          >
            {[25, 50, 100, 150, 200].map((n) => (
              <option key={n} value={n}>
                {n}/page
              </option>
            ))}
          </select>
          <button className="rounded-lg border px-3 py-2 bg-black text-white">
            Apply
          </button>
        </div>

        {/* Clear cursor on filter change */}
        <input type="hidden" name="cursorSec" value="" />
        <input type="hidden" name="cursorId" value="" />
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Athlete</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Mark</th>
              <th className="px-3 py-2">Season</th>
              <th className="px-3 py-2">Meet</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-gray-600" colSpan={7}>
                  No results match your filters.
                </td>
              </tr>
            ) : (
              filteredRows.map((r, idx) => {
                const p = profMap.get(r.athlete_id);
                const name = p?.full_name || p?.username || r.athlete_id;
                const avatar = p?.profile_pic_url || "";
                const username = p?.username || "";
                const school = p?.school_name ? `${p.school_name}${p.school_state ? `, ${p.school_state}` : ""}` : "—";
                const dateStr = r.meet_date ? new Date(r.meet_date).toISOString().slice(0, 10) : "—";

                return (
                  <tr key={`${r.athlete_id}-${r.event}-${idx}`} className="border-t">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gray-100">
                          {avatar ? (
                            <Image src={avatar} alt="" fill sizes="32px" className="object-cover" />
                          ) : (
                            <div className="grid h-8 w-8 place-items-center text-xs">🙂</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {username ? (
                              <Link
                                href={`/athletes/${username}`}
                                className="hover:underline"
                                title={`View ${name}`}
                              >
                                {name}
                              </Link>
                            ) : (
                              name
                            )}
                          </div>
                          <div className="truncate text-xs text-gray-500">{school}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">{r.event}</td>
                    <td className="px-3 py-2 font-medium">{fmtTime(r.best_seconds_adj)}</td>
                    <td className="px-3 py-2">{r.season ?? "—"}</td>
                    <td className="px-3 py-2">{r.meet_name ?? "—"}</td>
                    <td className="px-3 py-2">{dateStr}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Showing {filteredRows.length} of {rows.length} fetched
        </div>
        <div className="flex items-center gap-2">
          {/* Back = clear cursor */}
          <Link
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            href={buildHref(currentParams, { cursorSec: undefined, cursorId: undefined })}
          >
            Reset
          </Link>

          {/* Next page */}
          <Link
            className="rounded-md border px-3 py-1.5 text-sm bg-black text-white hover:opacity-90"
            href={buildHref(currentParams, {
              cursorSec: nextCursorSec,
              cursorId: nextCursorId,
            })}
          >
            Next →
          </Link>
        </div>
      </div>
    </div>
  );
}