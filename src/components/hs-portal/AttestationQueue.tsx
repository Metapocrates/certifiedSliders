"use client";

import { useState } from "react";
import Link from "next/link";
import { attestResultAction } from "@/app/(protected)/hs/portal/attest/actions";

type PendingResult = {
  result_id: number;
  athlete_id: string;
  athlete_name: string;
  athlete_profile_id: string | null;
  event: string;
  mark: string;
  meet_name: string;
  meet_date: string;
  season: string;
  proof_url: string | null;
  submitted_at: string;
  already_attested: boolean;
};

export default function AttestationQueue({
  results,
  teamId,
}: {
  results: PendingResult[];
  teamId: string;
}) {
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  async function handleAttest(resultId: number, decision: "approved" | "rejected") {
    setProcessingId(resultId);
    setFeedback(null);

    const formData = new FormData();
    formData.append("team_id", teamId);
    formData.append("result_id", resultId.toString());
    formData.append("decision", decision);
    formData.append("notes", notes[resultId] || "");

    try {
      const result = await attestResultAction(formData);

      if (result.success) {
        setFeedback({
          type: "success",
          text: `Result ${decision === "approved" ? "approved" : "rejected"} successfully`,
        });
        // Refresh page to update queue
        window.location.reload();
      } else {
        setFeedback({ type: "error", text: result.error || "Failed to attest result" });
      }
    } catch (error) {
      setFeedback({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`rounded-lg border p-4 ${
            feedback.type === "success"
              ? "border-green-300 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100"
              : "border-red-300 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100"
          }`}
        >
          <p className="text-sm">{feedback.text}</p>
        </div>
      )}

      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.result_id} className="rounded-xl border border-app bg-card p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-app">{result.athlete_name}</h3>
                  {result.athlete_profile_id && (
                    <Link
                      href={`/athletes/${result.athlete_profile_id}`}
                      className="text-xs text-scarlet hover:underline"
                      target="_blank"
                    >
                      View Profile →
                    </Link>
                  )}
                </div>
                <p className="text-sm text-muted">
                  Submitted {new Date(result.submitted_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Result Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Event</p>
                <p className="text-sm font-medium text-app">{result.event}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Mark</p>
                <p className="text-lg font-bold text-app">{result.mark}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Meet</p>
                <p className="text-sm font-medium text-app">{result.meet_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Date</p>
                <p className="text-sm font-medium text-app">
                  {new Date(result.meet_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Proof */}
            {result.proof_url && (
              <div>
                <p className="text-sm font-medium text-app mb-2">Proof:</p>
                <a
                  href={result.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-scarlet hover:underline"
                >
                  View Evidence →
                </a>
              </div>
            )}

            {/* Notes Input */}
            <div>
              <label
                htmlFor={`notes-${result.result_id}`}
                className="block text-sm font-medium text-app mb-2"
              >
                Notes (optional)
              </label>
              <textarea
                id={`notes-${result.result_id}`}
                value={notes[result.result_id] || ""}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, [result.result_id]: e.target.value }))
                }
                rows={2}
                maxLength={500}
                placeholder="Add any notes about this result..."
                className="w-full rounded-md border border-app bg-background px-3 py-2 text-app focus:border-scarlet focus:outline-none focus:ring-1 focus:ring-scarlet"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleAttest(result.result_id, "approved")}
                disabled={processingId === result.result_id}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === result.result_id ? "Processing..." : "Approve"}
              </button>
              <button
                onClick={() => handleAttest(result.result_id, "rejected")}
                disabled={processingId === result.result_id}
                className="flex-1 rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === result.result_id ? "Processing..." : "Reject"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
