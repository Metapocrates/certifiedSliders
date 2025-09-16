"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const EVENTS = [
  // Sprints/Hurdles (add more as you standardize)
  "100", "200", "400",
  "110H", "100H", "300H", "400H",
  "800", "1600", "3200",
  // Field/other can be added later (we’ll handle times first)
];

const GENDERS = [
  { label: "Any", value: "" },
  { label: "Boys", value: "M" },
  { label: "Girls", value: "F" },
];

const CLASS_YEARS = ["", "2026", "2027", "2028", "2029", "2030"];

export default function RankingsFilters({
  initial,
}: {
  initial: { event: string; gender: string; classYear: string };
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [event, setEvent] = useState(initial.event);
  const [gender, setGender] = useState(initial.gender);
  const [classYear, setClassYear] = useState(initial.classYear);

  const basePath = useMemo(() => "/rankings", []);

  function apply() {
    const params = new URLSearchParams(sp.toString());
    if (event) params.set("event", event); else params.delete("event");
    if (gender) params.set("gender", gender); else params.delete("gender");
    if (classYear) params.set("classYear", classYear); else params.delete("classYear");
    router.push(`${basePath}?${params.toString()}`);
  }

  function reset() {
    setEvent("");
    setGender("");
    setClassYear("");
    router.push(basePath);
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col">
        <label className="text-xs font-medium mb-1">Event</label>
        <select
          className="border rounded-md px-3 py-2"
          value={event}
          onChange={(e) => setEvent(e.target.value)}
        >
          <option value="">Any</option>
          {EVENTS.map((ev) => (
            <option key={ev} value={ev}>{ev}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-medium mb-1">Gender</label>
        <select
          className="border rounded-md px-3 py-2"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-medium mb-1">Class Year</label>
        <select
          className="border rounded-md px-3 py-2"
          value={classYear}
          onChange={(e) => setClassYear(e.target.value)}
        >
          {CLASS_YEARS.map((y) => (
            <option key={y || "any"} value={y}>{y || "Any"}</option>
          ))}
        </select>
      </div>

      <button
        className="rounded-md px-4 py-2 bg-black text-app"
        onClick={apply}
      >
        Apply
      </button>
      <button
        className="rounded-md px-4 py-2 border"
        onClick={reset}
      >
        Reset
      </button>
    </div>
  );
}
