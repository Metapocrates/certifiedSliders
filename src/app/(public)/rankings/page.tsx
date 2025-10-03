// src/app/(public)/rankings/page.tsx
import { createSupabaseServer } from "@/lib/supabase/compat";
import Link from "next/link";
import SafeLink from "@/components/SafeLink";
import type { ReactNode } from "react";

export const revalidate = 0; // always fresh
export const dynamic = "force-dynamic";

// ---------- Config ----------
const PAGE_SIZE = 50;
const MAX_FETCH = 4000;

type SortKey = "mark" | "name" | "school" | "date";
type Dir = "asc" | "desc";

type SearchParams = {
  event?: string;
  gender?: "M" | "F";
  class_bucket?: "FR" | "SO" | "JR" | "SR";
  page?: string;
  sort?: SortKey;
  dir?: Dir;
};

type ResultRow = {
  athlete_id: string;
  event: string;
  mark_seconds_adj: number | null;
  meet_name: string | null;
  meet_date: string | null; // ISO
  status: string | null;
};

type ProfileLite = {
  id: string;
  username: string | null;
  full_name: string | null;
  school_name: string | null;
  school_state: string | null;
  gender: "M" | "F" | null;
  class_year: number | null;
};

type Enriched = {
  athlete_id: string;
  event: string;
  mark_seconds_adj: number | null;
  meet_name: string | null;
  meet_date: string | null;

  username?: string | null;
  full_name?: string | null;
  school_name?: string | null;
  school_state?: string | null;
  gender?: "M" | "F" | null;
  class_year?: number | null;
  class_bucket?: "FR" | "SO" | "JR" | "SR" | null;
};

// ---------- Utils ----------
function Subtle({ children }: { children: ReactNode }) {
  return <span className="text-sm text-gray-500">{children}</span>;
}

function formatMark(sec: number | null): string {
  if (sec == null) return "—";
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return mm > 0 ? `${mm}:${ss.toFixed(2).padStart(5, "0")}` : ss.toFixed(2);
}

function formatMeet(name: string | null, dateISO: string | null): string {
  if (!name && !dateISO) return "—";
  const date = dateISO ? new Date(dateISO).toLocaleDateString() : "";
  return name ? `${name}${date ? ` — ${date}` : ""}` : date;
}

function buildQueryString(
  current: Partial<SearchParams>,
  overrides: Partial<Record<keyof SearchParams, string | number | undefined>>
): string {
  const qp = new URLSearchParams();
  const keys: (keyof SearchParams)[] = ["event","gender","class_bucket","page","sort","dir"];
  for (const k of keys) {
    const v = current[k];
    if (v != null && v !== "") qp.set(k, String(v));
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v == null || v === "") continue;
    qp.set(k, String(v));
  }
  const qs = qp.toString();
  return qs ? `?${qs}` : "";
}

// Derive FR/SO/JR/SR from graduation year (rough US school calendar)
function deriveClassBucket(class_year: number | null): "FR" | "SO" | "JR" | "SR" | null {
  if (!class_year) return null;
  const today = new Date();
  const month = today.getMonth(); // 0-11
  const schoolYearEnd = month >= 7 ? today.getFullYear() + 1 : today.getFullYear();
  const delta = class_year - schoolYearEnd; // 0 => SR, 1 => JR, 2 => SO, 3 => FR
  switch (delta) {
    case 0: return "SR";
    case 1: return "JR";
    case 2: return "SO";
    case 3: return "FR";
    default: return null;
  }
}

function applySort(rows: Enriched[], sort: SortKey, dir: Dir): Enriched[] {
  const asc = dir === "asc" ? 1 : -1;
  const cmpStr = (a?: string | null, b?: string | null) =>
    ((a ?? "").localeCompare(b ?? "")) * asc;
  const cmpNum = (a?: number | null, b?: number | null) => {
    const an = a ?? Number.POSITIVE_INFINITY;
    const bn = b ?? Number.POSITIVE_INFINITY;
    return (an - bn) * (dir === "asc" ? 1 : -1);
  };
  const cmpDate = (a?: string | null, b?: string | null) => {
    const ad = a ? new Date(a).getTime() : -Infinity;
    const bd = b ? new Date(b).getTime() : -Infinity;
    return (ad - bd) * (dir === "asc" ? 1 : -1);
  };

  const sorted = [...rows];
  switch (sort) {
    case "name":
      sorted.sort((x, y) => cmpStr(x.full_name ?? x.username, y.full_name ?? y.username));
      break;
    case "school":
      sorted.sort((x, y) => {
        const byName = cmpStr(x.school_name, y.school_name);
        if (byName !== 0) return byName;
        return cmpStr(x.school_state, y.school_state);
      });
      break;
    case "date":
      sorted.sort((x, y) => cmpDate(x.meet_date, y.meet_date));
      break;
    case "mark":
    default:
      sorted.sort((x, y) => cmpNum(x.mark_seconds_adj, y.mark_seconds_adj));
  }
  return sorted;
}

// Reduce to best (lowest mark_seconds_adj) per athlete+event
function bestPerAthleteEvent(rows: ResultRow[]): ResultRow[] {
  const best = new Map<string, ResultRow>();
  for (const r of rows) {
    const key = `${r.athlete_id}__${r.event}`;
    const prev = best.get(key);
    if (!prev) {
      best.set(key, r);
    } else {
      const a = r.mark_seconds_adj ?? Number.POSITIVE_INFINITY;
      const b = prev.mark_seconds_adj ?? Number.POSITIVE_INFINITY;
      if (a < b) best.set(key, r);
    }
  }
  return Array.from(best.values());
}

// ---------- Page ----------
export default async function RankingsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createSupabaseServer();

  const pageNum = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const sort: SortKey = (searchParams.sort as SortKey) ?? "mark";
  const dir: Dir = (searchParams.dir as Dir) ?? (sort === "date" ? "desc" : "asc");

  // 1) Dynamic events from verified results
  const { data: eventRows, error: eventErr } = await supabase
    .from("results")
    .select("event")
    .not("event", "is", null)
    .eq("status", "verified")
    .order("event", { ascending: true })
    .limit(1000);

  if (eventErr) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <h1 className="text-2xl font-semibold mb-4">Rankings</h1>
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          <div className="font-medium mb-1">Couldn’t load rankings</div>
          <div className="text-sm">{eventErr.message}</div>
        </div>
      </div>
    );
  }

  type EventRow = { event: string | null };
  const distinctEvents: string[] = Array.from(
    new Set(((eventRows ?? []) as EventRow[]).map(r => r.event).filter((e): e is string => !!e))
  );

  const event = searchParams.event && distinctEvents.includes(searchParams.event)
    ? searchParams.event
    : undefined;

  // 2) Pull VERIFIED results (optionally by event)
  let base = supabase
    .from("results")
    .select(["athlete_id","event","mark_seconds_adj","meet_name","meet_date","status"].join(","))
    .eq("status", "verified")
    .limit(MAX_FETCH);

  if (event) base = base.eq("event", event);
  base = base.order("mark_seconds_adj", { ascending: true, nullsFirst: false });

  const { data, error } = await base;

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <h1 className="text-2xl font-semibold mb-4">Rankings</h1>
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          <div className="font-medium mb-1">Couldn’t load rankings</div>
          <div className="text-sm">{error.message}</div>
        </div>
      </div>
    );
  }

  function isPlainObject(x: unknown): x is Record<string, unknown> {
    return Object.prototype.toString.call(x) === "[object Object]";
  }
  function isResultRow(r: unknown): r is ResultRow {
    if (!isPlainObject(r)) return false;
    return (
      typeof r.athlete_id === "string" &&
      typeof r.event === "string" &&
      (typeof r.mark_seconds_adj === "number" || r.mark_seconds_adj === null) &&
      (typeof r.meet_name === "string" || r.meet_name === null) &&
      (typeof r.meet_date === "string" || r.meet_date === null) &&
      (typeof r.status === "string" || r.status === null)
    );
  }
  const dataArray: unknown[] = Array.isArray(data) ? (data as unknown[]) : [];
  const verifiedRows: ResultRow[] = dataArray.filter(isResultRow);

  // 3) Reduce to best per athlete/event
  const bestRows = bestPerAthleteEvent(verifiedRows);

  // 4) Batch fetch profile info
  const athleteIds = Array.from(new Set(bestRows.map(r => r.athlete_id)));
  let profileMap = new Map<string, ProfileLite>();
  if (athleteIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, full_name, school_name, school_state, gender, class_year")
      .in("id", athleteIds);

    for (const p of (profs ?? []) as ProfileLite[]) {
      profileMap.set(p.id, p);
    }
  }

  // 5) Enrich + in-memory filter (gender, class)
  const enriched: Enriched[] = bestRows.map(r => {
    const p = profileMap.get(r.athlete_id);
    const class_bucket = deriveClassBucket(p?.class_year ?? null);
    return {
      athlete_id: r.athlete_id,
      event: r.event,
      mark_seconds_adj: r.mark_seconds_adj ?? null,
      meet_name: r.meet_name ?? null,
      meet_date: r.meet_date ?? null,

      username: p?.username ?? null,
      full_name: p?.full_name ?? null,
      school_name: p?.school_name ?? null,
      school_state: p?.school_state ?? null,
      gender: p?.gender ?? null,
      class_year: p?.class_year ?? null,
      class_bucket,
    };
  });

  const filtered = enriched.filter(row => {
    if (searchParams.gender && row.gender !== searchParams.gender) return false;
    if (searchParams.class_bucket && row.class_bucket !== searchParams.class_bucket) return false;
    return true;
  });

  // 6) Sort + paginate
  const sorted = applySort(filtered, sort, dir);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = Math.min(from + PAGE_SIZE, total);
  const pageRows = sorted.slice(from, to);
  const startDisplay = total === 0 ? 0 : from + 1;
  const endDisplay = to;

  const CLASS_BUCKETS_UI: { value: SearchParams["class_bucket"]; label: string }[] = [
    { value: "FR", label: "Freshman" },
    { value: "SO", label: "Sophomore" },
    { value: "JR", label: "Junior" },
    { value: "SR", label: "Senior" },
  ];
  const GENDERS_UI = [
    { value: "M" as const, label: "Boys" },
    { value: "F" as const, label: "Girls" },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4">
      <h1 className="text-2xl font-semibold mb-2">Rankings</h1>
      <p className="text-sm text-gray-600 mb-4">
        Filter, sort, and paginate best verified marks. Click an athlete to view their profile or audit trail.
      </p>

      {/* Quick event chips */}
      {distinctEvents.length > 0 && (
        <nav className="mb-4 overflow-x-auto">
          <ul className="flex gap-2 min-w-max">
            {distinctEvents.slice(0, 24).map((ev: string) => {
              const active = ev === event;
              const href = `/rankings${buildQueryString({ ...searchParams, event }, { event: ev, page: 1 })}`;
              return (
                <li key={ev}>
                  <Link
                    href={href}
                    className={`rounded-full border px-3 py-1 text-sm whitespace-nowrap ${
                      active ? "bg-black text-white" : "hover:opacity-90"
                    }`}
                  >
                    {ev}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Filters + Sorting */}
      <form className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7" action="/rankings" method="get">
        {/* Event */}
        <label className="block">
          <span className="block text-sm font-medium mb-1">Event</span>
          <select name="event" defaultValue={event ?? ""} className="w-full rounded-lg border p-2">
            <option value="">All events</option>
            {distinctEvents.map((ev: string) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
        </label>

        {/* Gender */}
        <label className="block">
          <span className="block text-sm font-medium mb-1">Gender</span>
          <select name="gender" defaultValue={searchParams.gender ?? ""} className="w-full rounded-lg border p-2">
            <option value="">All</option>
            {GENDERS_UI.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </label>

        {/* Class bucket */}
        <label className="block">
          <span className="block text-sm font-medium mb-1">Class</span>
          <select name="class_bucket" defaultValue={searchParams.class_bucket ?? ""} className="w-full rounded-lg border p-2">
            <option value="">All</option>
            {CLASS_BUCKETS_UI.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        {/* Sort */}
        <label className="block">
          <span className="block text-sm font-medium mb-1">Sort</span>
          <select name="sort" defaultValue={sort} className="w-full rounded-lg border p-2">
            <option value="mark">Best Mark</option>
            <option value="name">Name</option>
            <option value="school">School</option>
            <option value="date">Meet Date</option>
          </select>
        </label>

        {/* Direction */}
        <label className="block">
          <span className="block text-sm font-medium mb-1">Direction</span>
          <select name="dir" defaultValue={dir} className="w-full rounded-lg border p-2">
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </label>

        <input type="hidden" name="page" value="1" />

        <div className="flex items-end">
          <button type="submit" className="w-full rounded-xl border bg-black text-white px-4 py-2 hover:opacity-90">
            Apply
          </button>
        </div>

        <div className="flex items-end lg:col-span-7">
          <Subtle>{total === 0 ? "No results" : `Showing ${startDisplay}–${endDisplay} of ${total}`}</Subtle>
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Athlete</th>
              <th className="px-3 py-2">School</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Mark</th>
              <th className="px-3 py-2">Gender</th>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2">Meet</th>
              <th className="px-3 py-2">History</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-gray-500">No results match your filters yet.</td>
              </tr>
            ) : (
              pageRows.map((r: Enriched, i: number) => {
                const idx = from + i + 1;
                const username = r.username ?? undefined;
                const profileHref = username ? `/athletes/${username}` : undefined;
                const historyHref = username ? `/athletes/${username}/history` : undefined;
                return (
                  <tr key={`${r.athlete_id}-${r.event}-${i}`} className="border-t">
                    <td className="px-3 py-2">{idx}</td>
                    <td className="px-3 py-2">
                      <SafeLink href={profileHref} className="underline hover:opacity-80" fallback={<span>{r.full_name ?? username ?? "Unknown"}</span>}>
                        {r.full_name ?? username ?? "Unknown"}
                      </SafeLink>
                    </td>
                    <td className="px-3 py-2">
                      {r.school_name ? (
                        <>
                          {r.school_name} <Subtle>{r.school_state ? `(${r.school_state})` : ""}</Subtle>
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2">{r.event}</td>
                    <td className="px-3 py-2 font-medium">{formatMark(r.mark_seconds_adj)}</td>
                    <td className="px-3 py-2">{r.gender === "M" ? "Boys" : r.gender === "F" ? "Girls" : "—"}</td>
                    <td className="px-3 py-2">
                      {r.class_bucket
                        ? ({ FR:"Freshman", SO:"Sophomore", JR:"Junior", SR:"Senior" } as const)[r.class_bucket]
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{formatMeet(r.meet_name, r.meet_date)}</td>
                    <td className="px-3 py-2">
                      <SafeLink href={historyHref} className="underline hover:opacity-80">View</SafeLink>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <Link
          aria-disabled={pageNum <= 1}
          className={`rounded-xl border px-3 py-2 ${pageNum <= 1 ? "pointer-events-none opacity-40" : "hover:opacity-90"}`}
          href={`/rankings${buildQueryString(searchParams, { page: Math.max(1, pageNum - 1) })}`}
        >
          ← Prev
        </Link>
        <Subtle>Page {pageNum} of {totalPages}</Subtle>
        <Link
          aria-disabled={pageNum >= totalPages}
          className={`rounded-xl border px-3 py-2 ${pageNum >= totalPages ? "pointer-events-none opacity-40" : "hover:opacity-90"}`}
          href={`/rankings${buildQueryString(searchParams, { page: Math.min(totalPages, pageNum + 1) })}`}
        >
          Next →
        </Link>
      </div>

      <div className="mt-3">
        <Subtle>Showing {Math.min(PAGE_SIZE, pageRows.length)} per page.</Subtle>
      </div>
    </div>
  );
}
