"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

const EVENTS = [
  "100m", "200m", "400m", "800m", "1600m", "3200m",
  "110mh", "100mh", "300mh", "400mh",
  "4x100m", "4x400m",
  "high-jump", "pole-vault", "long-jump", "triple-jump",
  "shot-put", "discus", "javelin",
];

const CLASS_YEARS = ["", "2025", "2026", "2027", "2028", "2029", "2030"];

export default function CoachPortalFilters({
  initial,
}: {
  initial: {
    classYear: string;
    event: string;
    state: string;
    verified: boolean;
    search: string;
  };
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [classYear, setClassYear] = useState(initial.classYear);
  const [event, setEvent] = useState(initial.event);
  const [state, setState] = useState(initial.state);
  const [verified, setVerified] = useState(initial.verified);
  const [search, setSearch] = useState(initial.search);

  function apply() {
    const params = new URLSearchParams(sp.toString());
    if (classYear) params.set("classYear", classYear);
    else params.delete("classYear");
    if (event) params.set("event", event);
    else params.delete("event");
    if (state) params.set("state", state);
    else params.delete("state");
    if (verified) params.set("verified", "true");
    else params.delete("verified");
    if (search) params.set("search", search);
    else params.delete("search");
    params.delete("page"); // Reset to page 1 when filtering
    router.push(`/coach/portal?${params.toString()}`);
  }

  function reset() {
    setClassYear("");
    setEvent("");
    setState("");
    setVerified(false);
    setSearch("");
    router.push("/coach/portal");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="text-xs font-medium mb-1">Search Name</label>
          <input
            type="text"
            className="border rounded-md px-3 py-2"
            placeholder="Athlete name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
            }}
          />
        </div>

        {/* Class Year */}
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1">Class Year</label>
          <select
            className="border rounded-md px-3 py-2"
            value={classYear}
            onChange={(e) => setClassYear(e.target.value)}
          >
            <option value="">Any</option>
            {CLASS_YEARS.map((y) => (
              <option key={y || "any"} value={y}>
                {y || "Any"}
              </option>
            ))}
          </select>
        </div>

        {/* Event */}
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1">Event</label>
          <select
            className="border rounded-md px-3 py-2"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
          >
            <option value="">Any</option>
            {EVENTS.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
        </div>

        {/* State */}
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1">State</label>
          <input
            type="text"
            className="border rounded-md px-3 py-2 w-20"
            placeholder="CA"
            maxLength={2}
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
          />
        </div>

        {/* Verified Only */}
        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
            />
            <span className="text-sm">Verified Only</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="rounded-md px-4 py-2 bg-black text-app text-sm"
          onClick={apply}
        >
          Apply Filters
        </button>
        <button className="rounded-md px-4 py-2 border text-sm" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
