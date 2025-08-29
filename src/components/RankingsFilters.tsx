"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { DEFAULT_EVENTS, STATES } from "@/lib/rankings-constants";

export default function RankingsFilters() {
  const router = useRouter();
  const sp = useSearchParams();

  const event = sp.get("event") ?? "110mH";
  const gender = sp.get("gender") ?? "male";
  const classYear = sp.get("classYear") ?? "";
  const state = sp.get("state") ?? "";
  const sort = sp.get("sort") ?? "time_adj";

  const onChange = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`/rankings?${params.toString()}`);
  };

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => now + 1 - i);
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <select className="select" value={event} onChange={(e) => onChange("event", e.target.value)}>
        {DEFAULT_EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}
      </select>

      <select className="select" value={gender} onChange={(e) => onChange("gender", e.target.value)}>
        <option value="male">Boys</option>
        <option value="female">Girls</option>
      </select>

      <select className="select" value={classYear} onChange={(e) => onChange("classYear", e.target.value)}>
        <option value="">All Classes</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>

      <select className="select" value={state} onChange={(e) => onChange("state", e.target.value)}>
        <option value="">All States</option>
        {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <select className="select" value={sort} onChange={(e) => onChange("sort", e.target.value)}>
        <option value="time">Best Time (raw)</option>
        <option value="time_adj">Best Time (adjusted)</option>
        <option value="name">Name</option>
        <option value="date">Most Recent</option>
      </select>

      <div className="flex items-center text-sm opacity-70">Filters update instantly</div>
    </div>
  );
}
