"use client";

import { useState } from "react";
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

export default function FeaturedForm({
  primaryCandidates,
  otherCandidates,
}: {
  primaryCandidates: Candidate[];
  otherCandidates: Candidate[];
}) {
  const [state, formAction] = useFormState(setFeaturedAction, { ok: false });
  const [primarySelected, setPrimarySelected] = useState("");
  const [otherSelected, setOtherSelected] = useState("");

  // When one dropdown is selected, clear the other
  const handlePrimaryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPrimarySelected(e.target.value);
    if (e.target.value) setOtherSelected("");
  };

  const handleOtherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOtherSelected(e.target.value);
    if (e.target.value) setPrimarySelected("");
  };

  return (
    <form action={formAction} className="rounded-lg border p-4 space-y-3 bg-white">
      {/* Hidden input to pass the selected athlete ID */}
      <input type="hidden" name="athleteId" value={primarySelected || otherSelected} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">
            3-5 Star Athletes <span className="text-gray-500">(Primary)</span>
          </label>
          <select
            value={primarySelected}
            onChange={handlePrimaryChange}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">— Select 3-5 star athlete —</option>
            {primaryCandidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.username || "no-username"} • {p.full_name || "No name"} • {p.star_rating ?? 0}★
                {p.featured ? " (Featured)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Other Athletes <span className="text-gray-500">(Optional)</span>
          </label>
          <select
            value={otherSelected}
            onChange={handleOtherChange}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">— Select other athlete —</option>
            {otherCandidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.username || "no-username"} • {p.full_name || "No name"} •{" "}
                {p.star_rating ? `${p.star_rating}★` : "Unrated"}
                {p.featured ? " (Featured)" : ""}
              </option>
            ))}
          </select>
        </div>
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
