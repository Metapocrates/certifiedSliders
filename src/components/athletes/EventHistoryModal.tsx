"use client";

import { useState } from "react";
import SafeLink from "@/components/SafeLink";

type HistoryResult = {
  id: number;
  mark: string;
  markSeconds: number | null;
  wind: string | null;
  windValue: number | null;
  isWindLegal: boolean;
  meetName: string | null;
  meetDate: string | null;
  season: string | null;
  proofUrl: string | null;
  isPR: boolean;
  status: string;
};

type EventHistoryModalProps = {
  username: string;
  event: string;
  currentMark: string;
  onOpenChange?: (open: boolean) => void;
};

export default function EventHistoryModal({ username, event, currentMark, onOpenChange }: EventHistoryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HistoryResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setIsOpen(true);
    onOpenChange?.(true);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/athletes/${encodeURIComponent(username)}/events/${encodeURIComponent(event)}/history`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load history");
      }

      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setIsOpen(false);
    onOpenChange?.(false);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted transition hover:text-app"
      >
        Event history →
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={handleClose}
          style={{ pointerEvents: 'all' }}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'all' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b p-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{event}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  All results for {username} • Current best: <strong>{currentMark}</strong>
                </p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(85vh - 120px)" }}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-sm text-gray-500">Loading history...</div>
                </div>
              ) : error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              ) : results.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600">
                  No results found
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((r, idx) => (
                    <div
                      key={r.id}
                      className={`relative rounded-xl border p-5 transition hover:shadow-md ${
                        r.isPR
                          ? "border-green-300 bg-green-50/50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      {/* PR Badge */}
                      {r.isPR && (
                        <div className="absolute -right-1 -top-1 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                          PR
                        </div>
                      )}

                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-gray-900">{r.mark}</span>
                            {r.wind && (
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-medium ${
                                  r.isWindLegal
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {r.wind} {r.isWindLegal ? "" : "(IL)"}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span>{r.meetName || "Unknown meet"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{formatDate(r.meetDate)}</span>
                              {r.season && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-xs uppercase">{r.season}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {r.proofUrl && (
                            <SafeLink
                              href={r.proofUrl}
                              target="_blank"
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              View proof
                            </SafeLink>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
