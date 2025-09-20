"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getStandardsMetaAction,
  getEligibleAthletesAction,
  setStarRatingAction,
} from "./actions";

type Gender = "M" | "F" | "U";
type Star = 3 | 4 | 5;

export default function AdminRatingsPage() {
  // Meta (from rating_standards)
  const [meta, setMeta] = useState<{ events: string[]; classYears: number[]; genders: Gender[] } | null>(null);

  // Filters
  const [event, setEvent] = useState<string>("");
  const [classYear, setClassYear] = useState<number | "">("");
  const [gender, setGender] = useState<Gender>("U");
  const [star, setStar] = useState<Star>(3);

  // Eligible list + selection
  const [eligible, setEligible] = useState<{ username: string; fullName: string | null }[]>([]);
  const [username, setUsername] = useState<string>("");

  // Optional admin note + result
  const [note, setNote] = useState("");
  const [result, setResult] = useState<
    | { ok: true; username: string; fullName: string | null; oldRating: number | null; newRating: number }
    | { ok: false; error: string }
    | null
  >(null);

  const [isPending, startTransition] = useTransition();

  // Load standards metadata once
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await getStandardsMetaAction();
      if (!alive) return;

      if (res.ok) {
        const genders = (res.genders as Gender[]).length ? (res.genders as Gender[]) : (["U"] as Gender[]);
        setMeta({ events: res.events, classYears: res.classYears, genders });

        // Sensible defaults
        setEvent((prev) => (prev || res.events[0] || ""));
        setClassYear((prev) => (prev || res.classYears[0] || "") as any);
        setGender((prev) => (genders.includes(prev) ? prev : genders[0]));
      } else {
        setMeta({ events: [], classYears: [], genders: ["U"] as Gender[] });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canQuery = useMemo(() => Boolean(event && classYear && star), [event, classYear, star]);

  // Fetch eligible athletes when filters change
  useEffect(() => {
    if (!canQuery) return;
    let alive = true;

    startTransition(async () => {
      const res = await getEligibleAthletesAction({
        event,
        classYear: Number(classYear),
        gender,
        star,
      });
      if (!alive) return;

      if (res.ok) {
        const opts = res.athletes.map((a) => ({ username: a.username, fullName: a.fullName }));
        setEligible(opts);
        setUsername((prev) => (opts.find((o) => o.username === prev) ? prev : (opts[0]?.username ?? "")));
      } else {
        setEligible([]);
        setUsername("");
      }
    });

    return () => {
      alive = false;
    };
  }, [event, classYear, gender, star, canQuery, startTransition]);

  // Submit rating
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    const fd = new FormData();
    fd.append("username", username);
    fd.append("rating", String(star));
    if (note.trim()) fd.append("note", note.trim());

    startTransition(async () => {
      const res = await setStarRatingAction(fd);
      setResult(res as any);
    });
  };

  const noStandards = meta && (meta.events.length === 0 || meta.classYears.length === 0);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Admin · Star Ratings <span className="text-xs opacity-60">/ v3</span>
        </h1>
      </div>

      {noStandards && (
        <div className="mb-4 rounded-lg border p-4 text-sm">
          No rating standards found. Add rows to <code>rating_standards</code> to enable filtering.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border p-4">
        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm">Event</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              disabled={!meta || meta.events.length === 0}
              required
            >
              {(meta?.events ?? []).map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm">Class year</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={classYear}
              onChange={(e) => setClassYear(Number(e.target.value))}
              disabled={!meta || meta.classYears.length === 0}
              required
            >
              {(meta?.classYears ?? []).map((cy) => (
                <option key={cy} value={cy}>
                  {cy}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm">Gender</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              disabled={!meta || meta.genders.length === 0}
              required
            >
              {(meta?.genders ?? (["U"] as Gender[])).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm">Star</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={star}
              onChange={(e) => setStar(Number(e.target.value) as Star)}
              required
            >
              <option value={3}>3★</option>
              <option value={4}>4★</option>
              <option value={5}>5★</option>
            </select>
          </div>
        </div>

        {/* Eligible athletes */}
        <div>
          <label className="mb-1 block text-sm">Eligible athlete</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isPending || eligible.length === 0}
            required
          >
            {eligible.length === 0 ? (
              <option value="" disabled>
                No eligible athletes for these filters
              </option>
            ) : (
              eligible.map((a) => (
                <option key={a.username} value={a.username}>
                  {a.fullName ? `${a.fullName} (@${a.username})` : `@${a.username}`}
                </option>
              ))
            )}
          </select>
          <p className="mt-1 text-xs opacity-70">Only athletes meeting the selected cutoff are listed.</p>
        </div>

        {/* Optional note */}
        <div>
          <label className="mb-1 block text-sm">Note (optional)</label>
          <textarea
            className="w-full rounded-md border px-3 py-2"
            placeholder="Context for this change (admin-only)."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </div>

        <button type="submit" disabled={isPending || !username} className="rounded-xl border px-4 py-2 shadow-sm">
          {isPending ? "Saving…" : `Assign ${star}★`}
        </button>
      </form>

      {/* Result */}
      <section className="mt-6">
        {result && result.ok && (
          <div className="rounded-xl border p-4">
            <p className="text-sm">Updated:</p>
            <p className="text-lg font-semibold">
              {result.fullName ? `${result.fullName} ` : ""}(@{result.username})
            </p>
            <p className="mt-1">Old: {result.oldRating ?? "Unrated"} → New: {result.newRating}★</p>
          </div>
        )}
        {result && !result.ok && (
          <div className="rounded-xl border p-4">
            <p className="text-red-600">Error: {result.error}</p>
          </div>
        )}
      </section>
    </main>
  );
}
