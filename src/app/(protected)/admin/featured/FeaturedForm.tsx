"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setFeaturedAction } from "./actions";

type Candidate = {
  id: string;
  username: string | null;
  full_name: string | null;
  star_rating: number | null;
  featured: boolean | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-md bg-black text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50"
      type="submit"
      disabled={pending}
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

export default function FeaturedForm({ candidates }: { candidates: Candidate[] }) {
  const [state, formAction] = useFormState(setFeaturedAction, { ok: false });

  return (
    <form action={formAction} className="rounded-lg border p-4 space-y-3 bg-white">
      <div>
        <label className="block text-sm font-medium mb-1">Athlete</label>
        <select
          name="athleteId"
          className="w-full rounded-md border px-3 py-2 text-sm"
          required
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
        >
          <option value="false">Not featured</option>
          <option value="true">Featured</option>
        </select>
      </div>

      {state.ok && (
        <div className="rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700 bg-emerald-50">
          Successfully updated!
        </div>
      )}

      {state.error && (
        <div className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 bg-red-50">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
