"use client";

import { useState, useTransition } from "react";
import { addCollegeInterest, removeCollegeInterest } from "./actions";

export type CollegeInterest = {
  id: string;
  collegeName: string;
  createdAt: string;
};

export default function CollegeInterestsSection({
  interests,
}: {
  interests: CollegeInterest[];
}) {
  const [items, setItems] = useState<CollegeInterest[]>(interests);
  const [pending, startTransition] = useTransition();
  const [newCollege, setNewCollege] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCollege.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const res = await addCollegeInterest(trimmed);
      if (!res?.ok) {
        setError(res?.message ?? "Could not add college.");
        return;
      }
      if (res.entry) {
        setItems((prev) => {
          if (prev.some((p) => p.id === res.entry!.id)) {
            return prev;
          }
          return [...prev, res.entry!];
        });
      }
      setNewCollege("");
    });
  }

  function handleRemove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeCollegeInterest(id);
      if (!res?.ok) {
        setError(res?.message ?? "Could not remove college.");
        return;
      }
      setItems((prev) => prev.filter((p) => p.id !== id));
    });
  }

  return (
    <section className="mt-10 space-y-4 rounded-3xl border border-app bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Recruiting</p>
          <h2 className="text-2xl font-semibold text-app">Colleges of Interest</h2>
          <p className="text-sm text-muted">Pin schools you&apos;re talking with or want on your radar.</p>
        </div>
      </div>

      {items.length ? (
        <ul className="flex flex-wrap gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex items-center gap-2 rounded-full border border-app bg-muted px-3 py-1.5 text-sm font-medium text-app"
            >
              <span>{item.collegeName}</span>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                disabled={pending}
                className="text-xs text-muted transition hover:text-scarlet"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-app/60 bg-muted/40 px-4 py-4 text-sm text-muted">
          No colleges tracked yet. Add one below.
        </p>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
        <input
          value={newCollege}
          onChange={(e) => setNewCollege(e.target.value)}
          placeholder="College name"
          className="flex-1 min-w-[200px] rounded-full border border-app px-4 py-2 text-sm"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-scarlet px-4 py-2 text-sm font-semibold text-white transition hover:bg-scarlet/90 disabled:opacity-60"
        >
          {pending ? "Adding..." : "Add"}
        </button>
      </form>

      {error ? <p className="text-sm text-scarlet">{error}</p> : null}
    </section>
  );
}
