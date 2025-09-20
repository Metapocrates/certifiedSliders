"use client";

import { useEffect, useState, useTransition } from "react";
import {
  listStandardsAction,
  upsertStandardAction,
  deleteStandardAction,
} from "./actions";

type Gender = "M" | "F" | "U";
type Row = {
  event: string;
  grade: 9 | 10 | 11 | 12;
  gender: Gender;
  is_time: boolean;
  star3: number | null;
  star4: number | null;
  star5: number | null;
  source: string | null;
  notes: string | null;
  updated_at: string | null;
};

const TRACK_EVENTS = [
  { code: "100", label: "100m" },
  { code: "200", label: "200m" },
  { code: "400", label: "400m" },
  { code: "800", label: "800m" },
  { code: "1600", label: "1600m" },
  { code: "3200", label: "3200m" },
  { code: "110H", label: "110m Hurdles (Boys)" },
  { code: "100H", label: "100m Hurdles (Girls)" },
  { code: "300H", label: "300m Hurdles" },
  { code: "4x100", label: "4x100 Relay" },
  { code: "4x200", label: "4x200 Relay" },
  { code: "4x400", label: "4x400 Relay" },
  { code: "4x800", label: "4x800 Relay" },
];
const FIELD_EVENTS = [
  { code: "LJ", label: "Long Jump" },
  { code: "TJ", label: "Triple Jump" },
  { code: "HJ", label: "High Jump" },
  { code: "PV", label: "Pole Vault" },
  { code: "SP", label: "Shot Put" },
  { code: "DT", label: "Discus Throw" },
  { code: "JT", label: "Javelin Throw" },
];

const FIELD_SET = new Set(FIELD_EVENTS.map((e) => e.code));
const ALL_EVENTS = [...TRACK_EVENTS, ...FIELD_EVENTS];
const OTHER_CODE = "__OTHER__";
const GRADES: { value: 9 | 10 | 11 | 12; label: string }[] = [
  { value: 9, label: "Freshman" },
  { value: 10, label: "Sophomore" },
  { value: 11, label: "Junior" },
  { value: 12, label: "Senior" },
];

export default function StandardsAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // form
  const [event, setEvent] = useState("");
  const [customEvent, setCustomEvent] = useState("");
  const [grade, setGrade] = useState<9 | 10 | 11 | 12>(9);
  const [gender, setGender] = useState<Gender>("U");
  const [isTime, setIsTime] = useState(true);
  const [star3, setStar3] = useState<string>("");
  const [star4, setStar4] = useState<string>("");
  const [star5, setStar5] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const selectedEventCode = event === OTHER_CODE ? customEvent.trim() : event.trim();

  const load = () =>
    startTransition(async () => {
      const res = await listStandardsAction();
      if (res.ok) setRows(res.rows as Row[]);
      else setMsg(`Error: ${res.error}`);
    });

  useEffect(() => {
    load();
  }, []);

  // Auto-set metric type from catalog (override allowed)
  useEffect(() => {
    if (!selectedEventCode) return;
    if (event === OTHER_CODE) return;
    setIsTime(!FIELD_SET.has(selectedEventCode));
  }, [event, selectedEventCode]);

  const onChooseEvent = (code: string) => {
    setEvent(code);
    if (code !== OTHER_CODE) setCustomEvent("");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventCode) return;

    setMsg(null);
    startTransition(async () => {
      const res = await upsertStandardAction({
        event: selectedEventCode,
        grade,
        gender,
        isTime,
        star3: star3 ? Number(star3) : null,
        star4: star4 ? Number(star4) : null,
        star5: star5 ? Number(star5) : null,
        source: source || null,
        notes: notes || null,
      });
      if (res.ok) {
        setMsg("Saved.");
        load();
      } else {
        setMsg(`Error: ${res.error}`);
      }
    });
  };

  const onDelete = (r: Row) => {
    if (!confirm(`Delete standard ${r.event} / ${r.grade} / ${r.gender}?`)) return;
    setMsg(null);
    startTransition(async () => {
      const res = await deleteStandardAction({ event: r.event, grade: r.grade, gender: r.gender });
      if (res.ok) {
        setMsg("Deleted.");
        load();
      } else {
        setMsg(`Error: ${res.error}`);
      }
    });
  };

  const fillForEdit = (r: Row) => {
    if (ALL_EVENTS.some((e) => e.code === r.event)) {
      setEvent(r.event);
      setCustomEvent("");
    } else {
      setEvent(OTHER_CODE);
      setCustomEvent(r.event);
    }
    setGrade(r.grade);
    setGender(r.gender);
    setIsTime(r.is_time);
    setStar3(r.star3?.toString() ?? "");
    setStar4(r.star4?.toString() ?? "");
    setStar5(r.star5?.toString() ?? "");
    setSource(r.source ?? "");
    setNotes(r.notes ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin · Rating Standards (by grade)</h1>

      {msg && <div className="mb-4 rounded border p-3 text-sm">{msg}</div>}

      {/* Upsert form */}
      <form onSubmit={onSubmit} className="rounded-2xl border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Event</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={event || ""}
              onChange={(e) => onChooseEvent(e.target.value)}
              required
            >
              <option value="" disabled>Choose event…</option>
              <optgroup label="Track (time)">
                {TRACK_EVENTS.map((ev) => <option key={ev.code} value={ev.code}>{ev.label}</option>)}
              </optgroup>
              <optgroup label="Field (mark)">
                {FIELD_EVENTS.map((ev) => <option key={ev.code} value={ev.code}>{ev.label}</option>)}
              </optgroup>
              <option value={OTHER_CODE}>Other…</option>
            </select>
            {event === OTHER_CODE && (
              <input
                className="mt-2 w-full rounded-md border px-3 py-2"
                placeholder="Custom event code (must match results.event)"
                value={customEvent}
                onChange={(e) => setCustomEvent(e.target.value)}
                required
              />
            )}
          </div>

          <div>
            <label className="block text-sm mb-1">Grade</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value) as 9 | 10 | 11 | 12)}
            >
              {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Gender</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
            >
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="U">U</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Metric type</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={isTime ? "time" : "mark"}
              onChange={(e) => setIsTime(e.target.value === "time")}
            >
              <option value="time">Time (lower is better)</option>
              <option value="mark">Mark (higher is better)</option>
            </select>
            <p className="mt-1 text-xs opacity-70">Auto-set from event; override if needed.</p>
          </div>

          <div>
            <label className="block text-sm mb-1">Source</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="milesplit / manual"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">3★ cutoff</label>
            <input type="number" step="0.01" className="w-full rounded-md border px-3 py-2"
              placeholder={isTime ? "e.g., 14.90 (sec)" : "e.g., 6.50 (m)"}
              value={star3} onChange={(e) => setStar3(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">4★ cutoff</label>
            <input type="number" step="0.01" className="w-full rounded-md border px-3 py-2"
              value={star4} onChange={(e) => setStar4(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">5★ cutoff</label>
            <input type="number" step="0.01" className="w-full rounded-md border px-3 py-2"
              value={star5} onChange={(e) => setStar5(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Notes (optional)</label>
          <textarea className="w-full rounded-md border px-3 py-2"
            rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <button type="submit" disabled={isPending} className="rounded-xl border px-4 py-2 shadow-sm">
          {isPending ? "Saving…" : "Save / Update standard"}
        </button>
      </form>

      {/* List */}
      <div className="mt-6 rounded-2xl border">
        <div className="border-b px-4 py-2 text-sm opacity-70">Existing standards</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Grade</th>
                <th className="px-4 py-2">Gender</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">3★</th>
                <th className="px-4 py-2">4★</th>
                <th className="px-4 py-2">5★</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Updated</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td className="px-4 py-3" colSpan={10}>No standards yet.</td></tr>
              ) : rows.map((r) => (
                <tr key={`${r.event}-${r.grade}-${r.gender}`} className="border-t">
                  <td className="px-4 py-3">{r.event}</td>
                  <td className="px-4 py-3">
                    {r.grade === 9 ? "Freshman" : r.grade === 10 ? "Sophomore" : r.grade === 11 ? "Junior" : "Senior"}
                  </td>
                  <td className="px-4 py-3">{r.gender}</td>
                  <td className="px-4 py-3">{r.is_time ? "Time" : "Mark"}</td>
                  <td className="px-4 py-3">{r.star3 ?? "—"}</td>
                  <td className="px-4 py-3">{r.star4 ?? "—"}</td>
                  <td className="px-4 py-3">{r.star5 ?? "—"}</td>
                  <td className="px-4 py-3">{r.source ?? "—"}</td>
                  <td className="px-4 py-3">{r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button className="rounded border px-2 py-1" onClick={() => fillForEdit(r)}>Edit</button>
                    <button className="rounded border px-2 py-1" onClick={() => onDelete(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
