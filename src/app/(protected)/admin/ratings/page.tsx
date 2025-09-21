// src/app/(protected)/admin/ratings/page.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ChangeEvent, FormEvent } from "react";
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

type Eligible = { username: string; fullName: string | null; eligibleStar: number };

export default function AdminRatingsPage() {
  const [meta, setMeta] = useState<{
    events: string[];
    classYears: number[];
    genders: Gender[];
    grades: Grade[];
  } | null>(null);

  const [event, setEvent] = useState<string>("");
  const [grade, setGrade] = useState<Grade | "">("");
  const [classYear, setClassYear] = useState<number | "">("");
  const [gender, setGender] = useState<Gender>("U");

  const [eligible, setEligible] = useState<Eligible[]>([]);
  const [username, setUsername] = useState<string>("");

  const [star, setStar] = useState<Star>(3);
  const [note, setNote] = useState<string>("");
  const [result, setResult] = useState<{ ok: boolean; [k: string]: unknown } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load meta once
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await getStandardsMetaAction();
      if (!alive) return;
      if (res.ok) {
        const events = res.events as string[];
        const classYears = res.classYears as number[];
        const genders = (res.genders as Gender[]).length ? (res.genders as Gender[]) : (["U"] as Gender[]);
        const grades = (res.grades as Grade[]) ?? ([9, 10, 11, 12] as Grade[]);

        setMeta({ events, classYears, genders, grades });
        setEvent((prev) => prev || events[0] || "");
        setClassYear((prev) => (prev || classYears[0] || "") as any);
        setGender((prev) => (genders.includes(prev) ? prev : (genders[0] || "U")));
        setGrade((prev) => (prev || (grades[0] as Grade) || "") as any);
      } else {
        setMeta({ events: [], classYears: [], genders: ["U"], grades: [9, 10, 11, 12] });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canQuery = useMemo(() => Boolean(event && classYear && grade), [event, classYear, grade]);

  // Fetch eligible when filters change
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
        const list = (res.athletes as Eligible[]) || [];
        setEligible(list);

        // keep currently selected username if still present; else pick first
        const firstUsername = list[0]?.username ?? "";
        const chosen = list.find((x) => x.username === username) ? username : firstUsername;
        setUsername(chosen);

        // Clamp star to that athlete's max eligibility (or default to min allowed)
        const chosenMax = list.find((x) => x.username === chosen)?.eligibleStar ?? 0;
        setStar((prev) => {
          const clamped = Math.min(prev, Math.max(3 as Star, chosenMax as Star)) as Star;
          // if not eligible for 3★, just leave prev (button will be disabled)
          return chosenMax < 3 ? prev : clamped;
        });
      } else {
        setEligible([]);
        setUsername("");
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, classYear, grade, gender, canQuery]);

  // Derived selection
  const selectedEligible = eligible.find((e) => e.username === username);
  const maxEligible = selectedEligible?.eligibleStar ?? 0;
  const saveDisabled = isPending || !username || maxEligible < 3;

  // Handlers (typed to avoid TS7006)
  const onEventChange = (e: ChangeEvent<HTMLSelectElement>) => setEvent(e.target.value);
  const onGradeChange = (e: ChangeEvent<HTMLSelectElement>) => setGrade(Number(e.target.value) as Grade);
  const onClassYearChange = (e: ChangeEvent<HTMLSelectElement>) => setClassYear(Number(e.target.value));
  const onGenderChange = (e: ChangeEvent<HTMLSelectElement>) => setGender(e.target.value as Gender);
  const onUserChange = (e: ChangeEvent<HTMLSelectElement>) => setUsername(e.target.value);
  const onNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value);
  const onStarChange = (e: ChangeEvent<HTMLSelectElement>) => setStar(Number(e.target.value) as Star);

  const onSubmit = (e: FormEvent) => {
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
      setResult(res as any);
    });
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Admin · Star Ratings <span className="text-xs opacity-60">/ grade-based</span>
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border p-4">
        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm">Event</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={event}
              onChange={onEventChange}
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
            <label className="mb-1 block text-sm">Grade</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={grade}
              onChange={onGradeChange}
              disabled={!meta}
              required
            >
              {(meta?.grades ?? [9, 10, 11, 12]).map((g) => (
                <option key={g} value={g}>
                  {GRADE_LABEL[g as Grade]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm">Class year</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={classYear}
              onChange={onClassYearChange}
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
              onChange={onGenderChange}
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
            <select className="w-full rounded-md border px-3 py-2" value={star} onChange={onStarChange} required>
              <option value={3} disabled={maxEligible < 3}>
                3★
              </option>
              <option value={4} disabled={maxEligible < 4}>
                4★
              </option>
              <option value={5} disabled={maxEligible < 5}>
                5★
              </option>
            </select>
            <p className="mt-1 text-xs opacity-70">
              Max eligible for selected athlete: {maxEligible ? `${maxEligible}★` : "—"}
            </p>
          </div>
        </div>

        {/* Eligible Athletes */}
        <div>
          <label className="mb-1 block text-sm">Eligible athlete</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={username}
            onChange={onUserChange}
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
          <textarea
            className="w-full rounded-md border px-3 py-2"
            placeholder="Context for this change (admin-only)."
            value={note}
            onChange={onNoteChange}
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={saveDisabled}
          className={`rounded-xl px-4 py-2 border shadow-sm ${saveDisabled ? "opacity-40 pointer-events-none" : "hover:opacity-90"}`}
        >
          {isPending ? "Saving…" : `Assign ${star}★`}
        </button>
        {maxEligible < 3 && username ? (
          <p className="text-xs text-amber-700 mt-1">Selected athlete isn’t eligible for a star rating yet.</p>
        ) : null}
      </form>

      {/* Result */}
      <section className="mt-6">
        {result && result.ok && (
          <div className="rounded-xl border p-4">
            <p className="text-sm">Updated:</p>
            <p className="text-lg font-semibold">
              {result.fullName ? `${result.fullName as string} ` : ""}(@{result.username as string})
            </p>
            <p className="mt-1">
              Old: {(result.oldRating as number | null) ?? "Unrated"} → New: {result.newRating as number}★
            </p>
          </div>
        )}
        {result && !result.ok && (
          <div className="rounded-xl border p-4">
            <p className="text-red-600">Error: {(result.error as string) ?? "Unknown error"}</p>
          </div>
        )}
      </section>
    </main>
  );
}
