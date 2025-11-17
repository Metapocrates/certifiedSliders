"use client";

import { useRef, useState, useTransition } from "react";
import { addCollegeInterest, removeCollegeInterest, toggleDreamSchool } from "./actions";

export type CollegeInterest = {
  id: string;
  collegeName: string;
  createdAt: string;
  isDreamSchool?: boolean;
  lastModifiedAt?: string;
  canModify?: boolean;
  daysUntilModifiable?: number;
};

type Suggestion = {
  school_name: string;
  school_short_name: string;
  division: string | null;
  conference: string | null;
  school_slug: string;
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCollege.trim();
    if (!trimmed) return;
    setError(null);
    setSuggestions([]);
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

  function handleToggleDream(id: string, currentValue: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await toggleDreamSchool(id, !currentValue);
      if (!res?.ok) {
        setError(res?.message ?? "Could not update dream school status.");
        return;
      }
      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isDreamSchool: !currentValue } : item
        )
      );
    });
  }

  async function fetchSuggestions(name: string) {
    const query = name.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setLookupError(null);
      setLookupLoading(false);
      return;
    }

    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/ncaa-programs?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        setLookupError(text || "Lookup failed.");
        setSuggestions([]);
        return;
      }
      const payload = (await res.json()) as { data?: Suggestion[]; error?: string };
      if (payload.error) {
        setLookupError(payload.error);
        setSuggestions([]);
      } else {
        setLookupError(null);
        setSuggestions(payload.data ?? []);
      }
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      console.error("[college-interests] lookup failed", err);
      setLookupError("Could not reach NCAA directory.");
      setSuggestions([]);
    } finally {
      setLookupLoading(false);
      controllerRef.current = null;
    }
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
        <div className="space-y-2">
          <p className="text-xs text-muted">
            Tip: Mark up to 2 schools as dream schools. You can modify entries after 14 days. ({items.length}/10 schools)
          </p>
          <ul className="flex flex-wrap gap-3">
            {items.map((item) => {
              const dreamCount = items.filter((i) => i.isDreamSchool).length;
              const canMarkDream = !item.isDreamSchool && dreamCount < 2;

              return (
                <li
                  key={item.id}
                  className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
                    item.isDreamSchool
                      ? "border-yellow-400 bg-yellow-50 text-yellow-800"
                      : "border-app bg-muted text-app"
                  }`}
                >
                  {item.isDreamSchool && <span className="text-base">⭐</span>}
                  <span>{item.collegeName}</span>
                  <div className="flex items-center gap-1">
                    {(canMarkDream || item.isDreamSchool) && (
                      <button
                        type="button"
                        onClick={() => handleToggleDream(item.id, item.isDreamSchool || false)}
                        disabled={pending}
                        title={
                          item.isDreamSchool
                            ? "Remove dream school flag"
                            : "Mark as dream school"
                        }
                        className={`text-xs transition ${
                          item.isDreamSchool
                            ? "text-yellow-600 hover:text-yellow-800"
                            : "text-gray-400 hover:text-yellow-500"
                        } disabled:opacity-50`}
                      >
                        {item.isDreamSchool ? "★" : "☆"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      disabled={pending}
                      className="text-xs text-muted transition hover:text-scarlet"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-app/60 bg-muted/40 px-4 py-4 text-sm text-muted">
          No colleges tracked yet. Add one below.
        </p>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
        <input
          value={newCollege}
          onChange={(e) => {
            setNewCollege(e.target.value);
            fetchSuggestions(e.target.value);
          }}
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

      {lookupLoading ? (
        <p className="text-xs text-muted">Searching NCAA programs…</p>
      ) : lookupError ? (
        <p className="text-sm text-scarlet">{lookupError}</p>
      ) : null}

      {suggestions.length > 0 ? (
        <ul className="space-y-1 rounded-2xl border border-dashed border-app/60 bg-muted/40 p-3 text-sm">
          {suggestions.map((suggestion) => (
            <li key={suggestion.school_slug}>
              <button
                type="button"
                onClick={() => {
                  setNewCollege(suggestion.school_name);
                  setSuggestions([]);
                  setLookupError(null);
                }}
                className="flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-white/70"
              >
                <span className="font-semibold text-app">{suggestion.school_name}</span>
                <span className="text-xs text-muted">
                  Division {suggestion.division || "—"}
                  {suggestion.conference ? ` • ${suggestion.conference}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-sm text-scarlet">{error}</p> : null}
    </section>
  );
}
