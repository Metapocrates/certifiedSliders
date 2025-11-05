"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type EventResult = {
  event: string;
  bestMark: string;
  bestMarkSeconds: number | null;
  resultId: number;
  wind: number | null;
  windLegal: boolean | null;
  meetName: string | null;
  meetDate: string | null;
  proofUrl: string | null;
  season: string | null;
  visibleOnProfile: boolean;
  isFeatured: boolean;
  displayOrder: number;
};

type Props = {
  events: EventResult[];
};

const MAX_FEATURED = 5;

export default function EventsDisplayManager({ events: initialEvents }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Separate featured and non-featured events
  const featuredEvents = events
    .filter((e) => e.isFeatured)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const nonFeaturedEvents = events
    .filter((e) => !e.isFeatured)
    .sort((a, b) => a.event.localeCompare(b.event));

  function toggleFeatured(eventName: string) {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.event === eventName) {
          const newIsFeatured = !e.isFeatured;
          // Check if we're exceeding the max featured limit
          const currentFeaturedCount = prev.filter((ev) => ev.isFeatured).length;
          if (newIsFeatured && currentFeaturedCount >= MAX_FEATURED) {
            setError(`You can only feature up to ${MAX_FEATURED} events`);
            return e;
          }
          return { ...e, isFeatured: newIsFeatured };
        }
        return e;
      })
    );
    setMessage(null);
    setError(null);
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFeatured = [...featuredEvents];
    const draggedItem = newFeatured[draggedIndex];
    newFeatured.splice(draggedIndex, 1);
    newFeatured.splice(index, 0, draggedItem);

    // Update display_order
    const reordered = newFeatured.map((e, i) => ({ ...e, displayOrder: i }));

    setEvents((prev) => {
      const withoutFeatured = prev.filter((e) => !e.isFeatured);
      return [...withoutFeatured, ...reordered];
    });

    setDraggedIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  function toggleVisibility(eventName: string) {
    setEvents((prev) =>
      prev.map((e) => (e.event === eventName ? { ...e, visibleOnProfile: !e.visibleOnProfile } : e))
    );
    setMessage(null);
    setError(null);
  }

  function handleSave() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        // Build preferences array
        const preferences = events.map((e) => ({
          event: e.event,
          is_featured: e.isFeatured,
          display_order: e.displayOrder,
        }));

        // Build visibility map for results
        const visibilityUpdates: Record<number, boolean> = {};
        events.forEach((e) => {
          visibilityUpdates[e.resultId] = e.visibleOnProfile;
        });

        // Update preferences
        const prefsRes = await fetch("/api/profile/event-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences }),
        });

        if (!prefsRes.ok) {
          const data = await prefsRes.json().catch(() => ({}));
          setError(data?.error ?? "Failed to save preferences.");
          return;
        }

        // Update visibility
        const visRes = await fetch("/api/profile/update-event-visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibilityMap: visibilityUpdates }),
        });

        if (!visRes.ok) {
          const data = await visRes.json().catch(() => ({}));
          setError(data?.error ?? "Failed to save visibility.");
          return;
        }

        setMessage("Event preferences and visibility updated successfully!");
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Unexpected error. Please try again.");
      }
    });
  }

  const hasChanges =
    JSON.stringify(
      events.map((e) => ({ event: e.event, featured: e.isFeatured, order: e.displayOrder, visible: e.visibleOnProfile }))
    ) !==
    JSON.stringify(
      initialEvents.map((e) => ({ event: e.event, featured: e.isFeatured, order: e.displayOrder, visible: e.visibleOnProfile }))
    );

  const visibleCount = events.filter((e) => e.visibleOnProfile).length;
  const hiddenCount = events.length - visibleCount;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-app bg-card px-5 py-3">
        <div className="text-sm text-muted">
          <strong className="text-app">{featuredEvents.length}</strong> featured,{" "}
          <strong className="text-app">{nonFeaturedEvents.length}</strong> other,{" "}
          <strong className="text-app">{visibleCount}</strong> visible,{" "}
          <strong className="text-app">{hiddenCount}</strong> hidden
        </div>
        <p className="mt-1 text-xs text-muted">
          Check &quot;Visible&quot; to show on profile. Featured events appear first. Drag to reorder. (Max: {MAX_FEATURED} featured)
        </p>
      </div>

      {/* Featured Events */}
      {featuredEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-app">Featured Events</h3>
          <div className="rounded-xl border border-app bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold text-app w-12"></th>
                    <th className="px-4 py-3 font-semibold text-app">Event</th>
                    <th className="px-4 py-3 font-semibold text-app">Best Mark</th>
                    <th className="px-4 py-3 font-semibold text-app w-24">Visible</th>
                    <th className="px-4 py-3 font-semibold text-app">Featured</th>
                  </tr>
                </thead>
                <tbody>
                  {featuredEvents.map((event, index) => (
                    <tr
                      key={event.event}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`border-t border-app/20 hover:bg-muted/30 transition cursor-move ${
                        draggedIndex === index ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-muted">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8h16M4 16h16"
                          />
                        </svg>
                      </td>
                      <td className="px-4 py-3 font-medium text-app">{event.event}</td>
                      <td className="px-4 py-3 font-semibold">{event.bestMark}</td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={event.visibleOnProfile}
                          onChange={() => toggleVisibility(event.event)}
                          className="h-4 w-4 rounded border-app text-scarlet focus:ring-scarlet cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleFeatured(event.event)}
                          className="rounded-lg bg-scarlet/10 px-3 py-1.5 text-xs font-semibold text-scarlet hover:bg-scarlet/20 transition"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Other Events */}
      {nonFeaturedEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-app">Other Events</h3>
          <div className="rounded-xl border border-app bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold text-app">Event</th>
                    <th className="px-4 py-3 font-semibold text-app">Best Mark</th>
                    <th className="px-4 py-3 font-semibold text-app w-24">Visible</th>
                    <th className="px-4 py-3 font-semibold text-app">Featured</th>
                  </tr>
                </thead>
                <tbody>
                  {nonFeaturedEvents.map((event) => (
                    <tr
                      key={event.event}
                      className="border-t border-app/20 hover:bg-muted/30 transition"
                    >
                      <td className="px-4 py-3 font-medium text-app">{event.event}</td>
                      <td className="px-4 py-3 font-semibold">{event.bestMark}</td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={event.visibleOnProfile}
                          onChange={() => toggleVisibility(event.event)}
                          className="h-4 w-4 rounded border-app text-scarlet focus:ring-scarlet cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleFeatured(event.event)}
                          disabled={featuredEvents.length >= MAX_FEATURED}
                          className="rounded-lg border border-app px-3 py-1.5 text-xs font-semibold text-muted hover:bg-muted hover:text-app transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add to Featured
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
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
