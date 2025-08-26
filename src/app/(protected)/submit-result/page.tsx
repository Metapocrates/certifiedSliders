// src/app/(protected)/submit-result/page.tsx
"use client";

import { useActionState } from "react";
import {
  submitResultAction,
  type SubmitResultState,
} from "@/app/actions/submit-result";

const initialState: SubmitResultState | undefined = undefined;

export default function SubmitResultPage() {
  const [state, formAction] = useActionState(submitResultAction, initialState);

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Submit a Result</h1>
      <p className="text-sm text-gray-500 mb-6">
        Enter your mark as <code>SS.ss</code> or <code>M:SS.ss</code>. Wind is
        optional for sprints/jumps (e.g., <code>2.0</code> or <code>-1.3</code>
        ). Times are normalized server-side and adjusted in the DB.
      </p>

      {/* Inline feedback */}
      {state?.ok === false && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state?.ok === true && (
        <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700">
          Submitted! ID: {state.id}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="event">
            Event
          </label>
          <select id="event" name="event" className="w-full rounded border p-2">
            <option value="100m">100m</option>
            <option value="110mH">110mH</option>
            <option value="200m">200m</option>
            <option value="300mH">300mH</option>
            <option value="400m">400m</option>
            <option value="400mH">400mH</option>
            <option value="800m">800m</option>
            <option value="1600m">1600m</option>
            <option value="3200m">3200m</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="mark">
              Mark
            </label>
            <input
              id="mark"
              name="mark"
              required
              placeholder="53.76 or 1:53.21"
              className="w-full rounded border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="timing">
              Timing
            </label>
            <select
              id="timing"
              name="timing"
              className="w-full rounded border p-2"
              defaultValue="FAT"
            >
              <option value="FAT">FAT</option>
              <option value="HAND">Hand</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="wind">
              Wind (m/s)
            </label>
            <input
              id="wind"
              name="wind"
              type="number"
              step="0.1"
              placeholder="e.g., 2.0 or -1.3"
              className="w-full rounded border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="season">
              Season
            </label>
            <select
              id="season"
              name="season"
              className="w-full rounded border p-2"
              defaultValue="outdoor"
            >
              <option value="outdoor">Outdoor</option>
              <option value="indoor">Indoor</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="meet_name">
            Meet Name
          </label>
          <input
            id="meet_name"
            name="meet_name"
            required
            placeholder="Sunset Invitational"
            className="w-full rounded border p-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="meet_date">
              Meet Date
            </label>
            <input
              id="meet_date"
              name="meet_date"
              required
              type="date"
              className="w-full rounded border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="proof_url">
              Proof URL
            </label>
            <input
              id="proof_url"
              name="proof_url"
              type="url"
              placeholder="https://..."
              className="w-full rounded border p-2"
            />
          </div>
        </div>

        <input type="hidden" name="source" value="user" />

        <div className="pt-2">
          <button
            type="submit"
            className="rounded-xl px-4 py-2 border shadow-sm hover:shadow"
          >
            Submit
          </button>
        </div>
      </form>
    </main>
  );
}
