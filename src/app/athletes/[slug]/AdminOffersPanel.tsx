"use client";

import { useState, useTransition } from "react";
import { upsertOfferAction, deleteOfferByCollegeTypeAction } from "./offers-actions";

export default function AdminOffersPanel({ athleteId }: { athleteId: string }) {
  const [busy, start] = useTransition();
  const [college, setCollege] = useState("");
  const [type, setType] = useState<"interest" | "offer">("interest");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="font-semibold text-sm">Admin: Add/Update Offer</div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = college.trim();
          if (!name) return;
          setMsg(null);
          start(async () => {
            try {
              await upsertOfferAction(athleteId, name, type);
              setMsg("Saved.");
              setCollege("");
            } catch (err: any) {
              setMsg(err?.message ?? "Error saving offer");
            }
          });
        }}
      >
        <input
          className="border rounded px-2 py-1 text-sm min-w-56"
          placeholder="College name"
          value={college}
          onChange={(e) => setCollege(e.target.value)}
          disabled={busy}
        />
        <select
          className="border rounded px-2 py-1 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value as "interest" | "offer")}
          disabled={busy}
        >
          <option value="interest">Interest</option>
          <option value="offer">Offer</option>
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white text-sm px-3 py-1 rounded"
          disabled={busy}
        >
          Save
        </button>
        {msg && <span className="text-xs opacity-70">{msg}</span>}
      </form>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = college.trim();
          if (!name) return;
          setMsg(null);
          start(async () => {
            try {
              await deleteOfferByCollegeTypeAction(athleteId, name, type);
              setMsg("Deleted (if existed).");
              setCollege("");
            } catch (err: any) {
              setMsg(err?.message ?? "Error deleting offer");
            }
          });
        }}
      >
        <button
          type="submit"
          className="text-sm px-3 py-1 rounded border"
          disabled={busy}
        >
          Delete this {type} for {college || "…"}
        </button>
      </form>

      <p className="text-xs opacity-70">
        Saving the same college &amp; type again updates the existing row (conflict on
        <code> athlete_id, college_slug, offer_type</code>).
      </p>
    </div>
  );
}
