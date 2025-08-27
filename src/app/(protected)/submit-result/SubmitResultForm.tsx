"use client";

import { useRef, useEffect } from "react";
import { submitResultAction } from "@/app/actions/submit-result";
import type { EventRow } from "@/lib/events";

type Props = { events: EventRow[] };

export function SubmitResultForm({ events }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  // Optional: clear form on navigation or after a success redirect pattern
  useEffect(() => {
    // no-op for now
  }, []);

  const trackEvents = events.filter(e => e.discipline === "track");
  const fieldEvents = events.filter(e => e.discipline === "field");

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Submit a Result</h1>
      <p className="text-sm text-gray-500 mb-6">
        Track: enter <code>SS.ss</code> or <code>M:SS.ss</code>. Field: enter meters (e.g., <code>6.45</code>) or feet-inches (<code>22-04.5</code>).
      </p>

      {/* If you want inline success/error, use the redirect+searchParams pattern in Option C below */}
      <form
        ref={formRef}
        // @ts-expect-error Server Action signature is not in your local React types
        action={submitResultAction}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="event_id">Event</label>
          <select id="event_id" name="event_id" className="w-full rounded border p-2" required>
            {trackEvents.length > 0 && (
              <optgroup label="Track">
                {trackEvents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </optgroup>
            )}
            {fieldEvents.length > 0 && (
              <optgroup label="Field">
                {fieldEvents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </optgroup>
            )}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="mark">Mark</label>
            <input id="mark" name="mark" required placeholder="53.76 / 1:53.21 / 6.45 / 22-04.5" className="w-full rounded border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="timing">Timing</label>
            <select id="timing" name="timing" className="w-full rounded border p-2" defaultValue="FAT">
              <option value="FAT">FAT</option>
              <option value="HAND">Hand</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="wind">Wind (m/s)</label>
            <input id="wind" name="wind" type="number" step="0.1" placeholder="e.g., 2.0 or -1.3" className="w-full rounded border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="season">Season</label>
            <select id="season" name="season" className="w-full rounded border p-2" defaultValue="outdoor">
              <option value="outdoor">Outdoor</option>
              <option value="indoor">Indoor</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="meet_name">Meet Name</label>
          <input id="meet_name" name="meet_name" required placeholder="Sunset Invitational" className="w-full rounded border p-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="meet_date">Meet Date</label>
            <input id="meet_date" name="meet_date" required type="date" className="w-full rounded border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="proof_url">Proof URL</label>
            <input id="proof_url" name="proof_url" type="url" placeholder="https://..." className="w-full rounded border p-2" />
          </div>
        </div>

        <input type="hidden" name="source" value="user" />

        <div className="pt-2">
          <button type="submit" className="rounded-xl px-4 py-2 border shadow-sm hover:shadow">
            Submit
          </button>
        </div>
      </form>
    </main>
  );
}
