"use client";

import { useTransition, useState } from "react";
import {
  addAthleteInterestAction,
  removeAthleteInterestAction,
} from "./actions";

type Interest = {
  id: string;
  collegeName: string;
  createdAt: string;
};

export default function InterestsOffersSection({
  interests,
  offers,
  isOwnProfile,
}: {
  interests: Interest[];
  offers: { collegeName: string; type: string; createdAt: string }[];
  isOwnProfile: boolean;
}) {
  const [busy, start] = useTransition();
  const [newCollege, setNewCollege] = useState("");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Interests & Offers</h2>

      <div>
        <h3 className="font-medium">My Interests</h3>
        <ul className="list-disc list-inside">
          {interests.map((i) => (
            <li key={i.id} className="flex items-center justify-between">
              <span>{i.collegeName}</span>
              {isOwnProfile && (
                <button
                  className="text-sm text-red-600"
                  disabled={busy}
                  onClick={() =>
                    start(() => removeAthleteInterestAction(i.id))
                  }
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        {isOwnProfile && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCollege) return;
              start(() => addAthleteInterestAction(newCollege));
              setNewCollege("");
            }}
            className="mt-2 flex gap-2"
          >
            <input
              value={newCollege}
              onChange={(e) => setNewCollege(e.target.value)}
              placeholder="Add college..."
              className="border p-1 rounded flex-1"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-2 rounded"
              disabled={busy}
            >
              Add
            </button>
          </form>
        )}
      </div>

      <div>
        <h3 className="font-medium">College Offers</h3>
        <ul className="list-disc list-inside">
          {offers.map((o, idx) => (
            <li key={idx}>
              <span className="font-semibold">{o.collegeName}</span> —{" "}
              {o.type}
            </li>
          ))}
        </ul>
        {offers.length === 0 && <p className="text-sm text-gray-500">No offers yet</p>}
      </div>
    </div>
  );
}
