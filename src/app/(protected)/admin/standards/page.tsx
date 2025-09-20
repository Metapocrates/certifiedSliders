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
  class_year: number;
  gender: Gender;
  is_time: boolean;
  star3: number | null;
  star4: number | null;
  star5: number | null;
  source: string | null;
  notes: string | null;
  updated_at: string | null;
};

export default function StandardsAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // form state
  const [event, setEvent] = useState("");
  const [classYear, setClassYear] = useState<number | "">("");
  const [gender, setGender] = useState<Gender>("U");
  const [isTime, setIsTime] = useState(true);
  const [star3, setStar3] = useState<string>("");
  const [star4, setStar4] = useState<string>("");
  const [star5, setStar5] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const load = () =>
    startTransition(async () => {
      const res = await listStandardsAction();
      if (res.ok) setRows(res.rows as Row[]);
      else setMsg(`Error: ${res.error}`);
    });

  useEffect(() => {
    load();
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !classYear) return;
    setMsg(null);
    startTransition(async () => {
      const res = await upsertStandardAction({
        event,
        classYear: Number(classYear),
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
    if (!confirm(`Delete standard ${r.event} / ${r.class_year} / ${r.gender}?`)) return;
    setMsg(null);
    startTransition(async () => {
      const res = await deleteStandardAction({
        event: r.event,
        classYear: r.class_year,
        gender: r.gender,
      });
      if (res.ok) {
        setMsg("Deleted.");
        load();
      } else {
        setMsg(`Error: ${res.error}`);
      }
    });
  };

  const fillForEdit = (r: Row) => {
    setEvent(r.event);
    setClassYear(r.class_year);
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
      <h1 className="text-2xl font-semibold mb-4">Admin · Rating Standards</h1>

      {msg && <div className="mb-4 rounded border p-3 text-sm">{msg}</div>}

      {/* Upsert form */}
      <form onSubmit={onSubmit} className="rounded-2xl border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Event</label>
            <input className="w-full rounded-md border px-3 py-2"
              placeholder="e.g., 110H, 3200, LJ"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              required />
          </div>

          <div>
            <label className="block text-sm mb-1">Class Year</label>
            <input type="number" className="w-full rounded-md border px-3 py-2"
              placeholder="2028"
              value={classYear}
              onChange={(e) => setClassYear(e.target.value ? Number(e.target.value) : "")}
              required />
          </div>

          <div>
            <label className="block text-sm mb-1">Gender</label>
            <select className="w-full rounded-md border px-3 py-2"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}>
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="U">U</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Metric type</label>
            <select className="w-full rounded-md border px-3 py-2"
              value={isTime ? "time" : "mark"}
              onChange={(e) => setIsTime(e.target.value === "time")}>
              <option value="time">Time (lower is better)</option>
              <option value="mark">Mark (higher is better)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Source</label>
            <input className="w-full rounded-md border px-3 py-2"
              placeholder="milesplit / runcruit / manual"
              value={source}
              onChange={(e) => setSource(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">3★ cutoff</label>
            <input type="number" step="0.01" className="w-full rounded-md border px-3 py-2"
              placeholder={isTime ? "e.g., 14.90" : "e.g., 6.50"}
              value={star3}
              onChange={(e) => setStar3(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">4★ cutoff</label>
            <input type="number" step="0.01" className="w-full rounded-md border px-3 py-2"
              value={star4}
              onChange={(e) => setStar4(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">5★ cutoff</label>
            <input type="number" step="0.01" className="w-full rounded-md border px-3 py-2"
              value={star5}
              onChange={(e) => setStar5(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Notes (optional)</label>
          <textarea className="w-full rounded-md border px-3 py-2"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)} />
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
                <th className="px-4 py-2">Class</th>
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
                <tr key={`${r.event}-${r.class_year}-${r.gender}`} className="border-t">
                  <td className="px-4 py-3">{r.event}</td>
                  <td className="px-4 py-3">{r.class_year}</td>
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
