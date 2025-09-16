"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type ProfileLite = {
  id: string;
  username: string | null;
  full_name: string | null;
  star_rating: number | null;
};

type Tier = "" | "3" | "4" | "5"; // "" = Unrated

export default function AdminRatingsPage() {
  const [athletes, setAthletes] = useState<ProfileLite[]>([]);
  const [username, setUsername] = useState<string>("");
  const [tier, setTier] = useState<Tier>(""); // radio: "", "3", "4", "5"
  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Load a list of athletes for the dropdown
  useEffect(() => {
    let ok = true;
    (async () => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, star_rating")
        .order("full_name", { ascending: true })
        .limit(500);
      if (!ok) return;
      if (error) {
        setMsg(`Load error: ${error.message}`);
      } else {
        setAthletes((data ?? []) as ProfileLite[]);
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  // Keep the selected tier in sync when you change the user in the dropdown
  const selected = useMemo(
    () => athletes.find((a) => a.username === username) || null,
    [athletes, username]
  );

  useEffect(() => {
    if (!selected) return setTier("");
    if (selected.star_rating === 3) setTier("3");
    else if (selected.star_rating === 4) setTier("4");
    else if (selected.star_rating === 5) setTier("5");
    else setTier("");
  }, [selected]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!username) {
      setMsg("Pick an athlete");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        username,
        star: tier === "" ? null : Number(tier), // null | 3 | 4 | 5
      };
      const res = await fetch("/api/admin/set-star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(`Error: ${json?.error ?? res.statusText}`);
      } else {
        // Prefer the server's 'after' value. Fall back to profile.star_rating if needed.
        const after =
          json?.after ?? json?.profile?.star_rating ?? null;
        const shown = after == null ? "Unrated" : `${after}★`;
        setMsg(`Updated: ${json?.username ?? username} → ${shown}`);

        // Reflect the update locally so the dropdown shows the new tier immediately
        setAthletes((prev) =>
          prev.map((a) =>
            a.username === username ? { ...a, star_rating: after } : a
          )
        );
      }
    } catch (err: any) {
      setMsg(`Network error${err?.message ? `: ${err.message}` : ""}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-xl font-semibold mb-4">Admin: Set Star Rating</h1>

      <form onSubmit={submit} className="space-y-5 rounded-xl border p-4">
        {/* Athlete picker */}
        <div>
          <label className="block text-sm font-medium mb-1">Athlete</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          >
            <option value="" disabled>
              — Select an athlete —
            </option>
            {athletes.map((a) => (
              <option key={a.id} value={a.username ?? ""}>
                {a.full_name ?? a.username ?? a.id}
                {a.username ? ` (@${a.username})` : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Loaded {athletes.length} athletes. Start with smaller data; we’ll make this
            searchable later if needed.
          </p>
        </div>

        {/* Star tier radios */}
        <div>
          <label className="block text-sm font-medium mb-2">Star Tier</label>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
              <input
                type="radio"
                name="tier"
                value=""
                checked={tier === ""}
                onChange={() => setTier("")}
              />
              Unrated
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
              <input
                type="radio"
                name="tier"
                value="3"
                checked={tier === "3"}
                onChange={() => setTier("3")}
              />
              3★
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
              <input
                type="radio"
                name="tier"
                value="4"
                checked={tier === "4"}
                onChange={() => setTier("4")}
              />
              4★
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
              <input
                type="radio"
                name="tier"
                value="5"
                checked={tier === "5"}
                onChange={() => setTier("5")}
              />
              5★
            </label>
          </div>
          <p className="mt-1 text-xs text-muted">
            Allowed values: Unrated, 3★, 4★, 5★. Updates revalidate the athlete page.
          </p>
        </div>

        <button
          type="submit"
          disabled={busy || !username}
          className="rounded bg-black px-4 py-2 text-app disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>

        {msg ? <p className="mt-2 text-sm">{msg}</p> : null}
      </form>

      {/* Live preview of selection (helpful for sanity checks) */}
      {selected ? (
        <div className="mt-6 rounded-xl border p-4 text-sm">
          <div className="font-medium mb-1">
            {selected.full_name ?? selected.username ?? selected.id}
            {selected.username ? ` (@${selected.username})` : ""}
          </div>
          <div className="text-gray-600">
            Current DB value:{" "}
            {selected.star_rating == null ? "Unrated" : `${selected.star_rating}★`}
          </div>
          <div>
            New value to save: {tier === "" ? "Unrated" : `${tier}★`}
          </div>
        </div>
      ) : null}
    </main>
  );
}
