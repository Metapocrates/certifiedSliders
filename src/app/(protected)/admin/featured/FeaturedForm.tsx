"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFeaturedAction } from "./actions";

type Candidate = {
  id: string;
  username: string | null;
  full_name: string | null;
  star_rating: number | null;
  featured: boolean | null;
};

export default function FeaturedForm({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const athleteId = formData.get("athleteId") as string;
    const featured = formData.get("featured") as string;

    if (!athleteId) {
      setMessage({ type: "error", text: "Please select an athlete" });
      return;
    }

    startTransition(async () => {
      const result = await setFeaturedAction(formData);

      if (result.ok) {
        setMessage({
          type: "success",
          text: `Successfully ${featured === "true" ? "featured" : "unfeatured"} athlete`
        });
        // Reset form
        e.currentTarget.reset();
        // Refresh to show updated list
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error || "Failed to update" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-3 bg-white">
      <div>
        <label className="block text-sm font-medium mb-1">Athlete</label>
        <select
          name="athleteId"
          className="w-full rounded-md border px-3 py-2 text-sm"
          required
          disabled={isPending}
        >
          <option value="">— Select athlete —</option>
          {candidates.map((p) => (
            <option key={p.id} value={p.id}>
              {p.username || "no-username"} • {p.full_name || "No name"} •{" "}
              {p.star_rating ?? 0}★ • currently: {p.featured ? "Featured" : "Not featured"}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Featured status</label>
        <select
          name="featured"
          className="w-full rounded-md border px-3 py-2 text-sm"
          defaultValue="false"
          disabled={isPending}
        >
          <option value="false">Not featured</option>
          <option value="true">Featured</option>
        </select>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            message.type === "success"
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : "text-red-700 bg-red-50 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        className="rounded-md bg-black text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
