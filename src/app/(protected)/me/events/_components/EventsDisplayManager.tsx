"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type EventResult = {
  id: number;
  event: string;
  mark: string;
  windLegal: boolean | null;
  wind: number | null;
  meetName: string | null;
  meetDate: string | null;
  proofUrl: string | null;
  season: string | null;
  visibleOnProfile: boolean;
};

type Props = {
  events: EventResult[];
};

export default function EventsDisplayManager({ events }: Props) {
  const router = useRouter();
  const [visibilityMap, setVisibilityMap] = useState<Record<number, boolean>>(
    Object.fromEntries(events.map((e) => [e.id, e.visibleOnProfile]))
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleToggle(id: number) {
    setVisibilityMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    setMessage(null);
    setError(null);
  }

  function handleToggleAll(visible: boolean) {
    setVisibilityMap(Object.fromEntries(events.map((e) => [e.id, visible])));
    setMessage(null);
    setError(null);
  }

  function handleSave() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/profile/update-event-visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibilityMap }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(data?.error ?? "Failed to save changes. Please try again.");
          return;
        }

        setMessage("Event visibility updated successfully!");
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Unexpected error. Please try again.");
      }
    });
  }

  const hasChanges = events.some((e) => visibilityMap[e.id] !== e.visibleOnProfile);
  const visibleCount = Object.values(visibilityMap).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-app bg-card px-5 py-3">
        <div className="text-sm text-muted">
          <strong className="text-app">{visibleCount}</strong> of <strong className="text-app">{events.length}</strong>{" "}
          events visible on public profile
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleToggleAll(true)}
            className="rounded-lg border border-app px-3 py-1.5 text-xs font-semibold text-muted hover:bg-muted hover:text-app transition"
          >
            Show all
          </button>
          <button
            type="button"
            onClick={() => handleToggleAll(false)}
            className="rounded-lg border border-app px-3 py-1.5 text-xs font-semibold text-muted hover:bg-muted hover:text-app transition"
          >
            Hide all
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-app bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold text-app w-12">Visible</th>
                <th className="px-4 py-3 font-semibold text-app">Event</th>
                <th className="px-4 py-3 font-semibold text-app">Best Mark</th>
                <th className="px-4 py-3 font-semibold text-app">Wind</th>
                <th className="px-4 py-3 font-semibold text-app">Meet</th>
                <th className="px-4 py-3 font-semibold text-app">Season</th>
                <th className="px-4 py-3 font-semibold text-app">Proof</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const dateStr = event.meetDate
                  ? new Date(event.meetDate).toLocaleDateString()
                  : "—";

                return (
                  <tr key={event.id} className="border-t border-app/20 hover:bg-muted/30 transition">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={visibilityMap[event.id] ?? false}
                        onChange={() => handleToggle(event.id)}
                        className="h-4 w-4 rounded border-app text-scarlet focus:ring-scarlet cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-app">{event.event}</td>
                    <td className="px-4 py-3 font-semibold">{event.mark}</td>
                    <td className="px-4 py-3 text-muted">
                      {event.wind != null
                        ? `${event.wind > 0 ? "+" : ""}${event.wind}${event.windLegal ? " ✓" : ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {event.meetName ? `${event.meetName} (${dateStr})` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">{event.season ?? "—"}</td>
                    <td className="px-4 py-3">
                      {event.proofUrl ? (
                        <a
                          href={event.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-scarlet underline hover:text-scarlet/80"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-app bg-card px-5 py-4">
        <div className="text-sm">
          {hasChanges ? (
            <p className="text-muted">You have unsaved changes</p>
          ) : (
            <p className="text-green-600">All changes saved</p>
          )}
          {message && <p className="mt-1 text-green-600">{message}</p>}
          {error && <p className="mt-1 text-scarlet">{error}</p>}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || pending}
          className="rounded-lg bg-scarlet px-6 py-2.5 text-sm font-semibold text-white hover:bg-scarlet/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
