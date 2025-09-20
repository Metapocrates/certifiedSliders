// src/app/(protected)/admin/ratings/page.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getStandardsMetaAction,
  getEligibleAthletesByGradeAction,
  setStarRatingAction,
} from "./actions";

type Gender = "M" | "F" | "U";
type Star = 3 | 4 | 5;
type Grade = 9 | 10 | 11 | 12;

const GRADE_LABEL: Record<Grade, string> = {
  9: "Freshman",
  10: "Sophomore",
  11: "Junior",
  12: "Senior",
};

export default function AdminRatingsPage() {
  const [meta, setMeta] = useState<{ events: string[]; classYears: number[]; genders: Gender[]; grades: Grade[] } | null>(null);

  const [event, setEvent] = useState<string>("");
  const [grade, setGrade] = useState<Grade | "">("");
  const [classYear, setClassYear] = useState<number | "">("");
  const [gender, setGender] = useState<Gender>("U");

  const [eligible, setEligible] = useState<{ username: string; fullName: string | null; eligibleStar: number }[]>([]);
  const [username, setUsername] = useState<string>("");

  const [star, setStar] = useState<Star>(3);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  // Load meta
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await getStandardsMetaAction();
      if (!alive) return;
      if (res.ok) {
        setMeta({
          events: res.events,
          classYears: res.classYears,
          genders: (res.genders as Gender[]).length ? (res.genders as Gender[]) : (["U"] as Gender[]),
          grades: (res.grades as Grade[]) ?? ([9, 10, 11, 12] as Grade[]),
        });
        setEvent((prev) => prev || res.events[0] || "");
        setClassYear((prev) => (prev || res.classYears[0] || "") as any);
        setGender((prev) => ((res.genders as Gender[]).includes(prev) ? prev : ((res.genders as Gender[])[0] || "U")));
        setGrade((prev) => (prev || (res.grades?.[0] as Grade) || "") as any);
      } else {
        setMeta({ events: [], classYears: [], genders: ["U"] as Gender[], grades: [9, 10, 11, 12] as Grade[] });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canQuery = useMemo(() => Boolean(event && classYear && grade), [event, classYear, grade]);

  // Fetch eligible (with eligibleStar)
  useEffect(() => {
    if (!canQuery) return;
    let alive = true;
    startTransition(async () => {
      const res = await getEligibleAthletesByGradeAction({
        event,
        classYear: Number(classYear),
        grade: Number(grade) as Grade,
        gender,
      });
      if (!alive) return;

      if (res.ok) {
        const list = res.athletes as { username: string; fullName: string | null; eligibleStar: number }[];
        setEligible(list);
        const first = list[0]?.username ?? "";
        setUsername((prev) => (list.find((x) => x.username === prev) ? prev : first));
        // default star to the selected athlete's max eligibility
        const firstMax = list.find((x) => x.username === (list.find(() => true)?.username))?.eligibleStar ?? 3;
        setStar((prev) => (prev > firstMax ? (firstMax as Star) : (prev as Star)));
      } else {
        setEligible([]);
        setUsername("");
      }
    });
    return () => {
      alive = false;
    };
  }, [event, classYear, grade, gender, canQuery, startTransition]);

  // When athlete selection changes, clamp star to their max
  const selectedEligible = eligible.find((e) => e.username === username);
  const maxEligible = selectedEligible?.eligibleStar ?? 0;

  useEffect(() => {
    if (!username) return;
    if (maxEligible && star > maxEligible) setStar(maxEligible as Star);
  }, [username, maxEligible]); // eslint-disable-line

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !event || !grade || !classYear) return;

    const fd = new FormData();
    fd.append("username", username);
    fd.append("rating", String(star));
    fd.append("event", event);
    fd.append("grade", String(grade));
    fd.append("classYear", String(classYear));
    fd.append("gender", gender);
    if (note.trim()) fd.append("note", note.trim());

    startTransition(async () => {
      const res = await setStarRatingAction(fd);
      setResult(res);
    });
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin · Star Ratings <span className="text-xs opacity-60">/ grade-based</span></h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border p-4">
        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm">Event</label>
            <select className="w-full rounded-md border px-3 py-2"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              disabled={!meta || meta.events.length === 0}
              required>
              {(meta?.events ?? []).map((ev) => <option key={ev} value={ev}>{ev}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm">Grade</label>
            <select className="w-full rounded-md border px-3 py-2"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value) as Grade)}
              disabled={!meta}
              required>
              {(meta?.grades ?? [9,10,11,12]).map((g) => (
                <option key={g} value={g}>{GRADE_LABEL[g as Grade]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm">Class year</label>
            <select className="w-full rounded-md border px-3 py-2"
              value={classYear}
              onChange={(e) => setClassYear(Number(e.target.value))}
              disabled={!meta || meta.classYears.length === 0}
              required>
              {(meta?.classYears ?? []).map((cy) => <option key={cy} value={cy}>{cy}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm">Gender</label>
            <select className="w-full rounded-md border px-3 py-2"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              disabled={!meta || meta.genders.length === 0}
              required>
              {(meta?.genders ?? (["U"] as Gender[])).map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm">Star</label>
            <select className="w-full rounded-md border px-3 py-2"
              value={star}
              onChange={(e) => setStar(Number(e.target.value) as Star)}
              required>
              <option value={3} disabled={maxEligible < 3}>3★</option>
              <option value={4} disabled={maxEligible < 4}>4★</option>
              <option value={5} disabled={maxEligible < 5}>5★</option>
            </select>
            <p className="mt-1 text-xs opacity-70">
              Max eligible for selected athlete: {maxEligible ? `${maxEligible}★` : "—"}
            </p>
          </div>
        </div>

        {/* Eligible Athletes */}
        <div>
          <label className="mb-1 block text-sm">Eligible athlete</label>
          <select className="w-full rounded-md border px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isPending || eligible.length === 0}
            required>
            {eligible.length === 0 ? (
              <option value="" disabled>No eligible athletes for these filters</option>
            ) : (
             eligible.map((a) => (
  <option key={a.username} value={a.username}>
    {(a.fullName ? `${a.fullName} ` : "") + `(@${a.username})`} — eligible up to {a.eligibleStar || 0}★
  </option>
))

            )}
          </select>
          <p className="text-xs opacity-70 mt-1">
            Eligibility is computed from grade-based cutoffs and best mark in that grade.
          </p>
        </div>

        {/* Optional note */}
        <div>
          <label className="mb-1 block text-sm">Note (optional)</label>
          <textarea className="w-full rounded-md border px-3 py-2"
            placeholder="Context for this change (admin-only)."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </div>

        <button type="submit" disabled={isPending || !username} className="rounded-xl px-4 py-2 border shadow-sm">
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
