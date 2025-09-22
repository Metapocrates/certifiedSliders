"use client";

import { useState, useTransition } from "react";
import { addInterestAction, removeInterestAction } from "./interests-actions";

type Interest = { id: string; college_name: string; created_at: string };

export default function InterestsSelfServe({
  athleteId,
  slug,
  interests,
  canEdit,
}: {
  athleteId: string;
  slug: string;
  interests: Interest[];
  canEdit: boolean;
}) {
  const [val, setVal] = useState("");
  const [busy, start] = useTransition();

  return (
    <div>
      <ul className="mt-2 space-y-1">
        {interests.map((i) => (
          <li key={i.id} className="flex items-center justify-between">
            <span className="text-sm">{i.college_name}</span>
            {canEdit && (
              <button
                className="text-xs text-red-600"
                disabled={busy}
                onClick={() => start(() => removeInterestAction(i.id, slug))}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = val.trim();
            if (!name) return;
            start(async () => {
              await addInterestAction(athleteId, name, slug);
              setVal("");
            });
          }}
        >
          <input
            className="border rounded px-2 py-1 text-sm flex-1"
            placeholder="Add college (e.g., Stanford University)"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            disabled={busy}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm px-3 py-1 rounded"
            disabled={busy}
          >
            Add
          </button>
        </form>
      )}
    </div>
  );
}
