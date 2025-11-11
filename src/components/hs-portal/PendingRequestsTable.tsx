"use client";

import { useState } from "react";
import Link from "next/link";
import { reviewJoinRequestAction } from "@/app/(protected)/hs/portal/roster/pending/actions";

type PendingRequest = {
  request_id: string;
  athlete_id: string;
  athlete_name: string;
  athlete_username: string | null;
  athlete_profile_id: string | null;
  athlete_school: string | null;
  athlete_class_year: number | null;
  message: string | null;
  created_at: string;
};

export default function PendingRequestsTable({
  requests,
  teamId,
}: {
  requests: PendingRequest[];
  teamId: string;
}) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleReview(requestId: string, decision: "approved" | "denied") {
    setProcessingId(requestId);
    setFeedback(null);

    const formData = new FormData();
    formData.append("team_id", teamId);
    formData.append("request_id", requestId);
    formData.append("decision", decision);

    try {
      const result = await reviewJoinRequestAction(formData);

      if (result.success) {
        setFeedback({
          type: "success",
          text: `Request ${decision === "approved" ? "approved" : "denied"} successfully`,
        });
        window.location.reload();
      } else {
        setFeedback({ type: "error", text: result.error || "Failed to process request" });
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

      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.request_id}
            className="rounded-xl border border-app bg-card p-5 flex items-start gap-4"
          >
            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-app">{request.athlete_name}</h3>
                {request.athlete_profile_id && (
                  <Link
                    href={`/athletes/${request.athlete_profile_id}`}
                    className="text-xs text-scarlet hover:underline"
                    target="_blank"
                  >
                    View Profile →
                  </Link>
                )}
              </div>

              <div className="text-sm text-muted space-y-0.5">
                {request.athlete_username && <div>@{request.athlete_username}</div>}
                {request.athlete_school && <div>{request.athlete_school}</div>}
                {request.athlete_class_year && <div>Class of {request.athlete_class_year}</div>}
                <div className="text-xs">Requested {new Date(request.created_at).toLocaleDateString()}</div>
              </div>

              {request.message && (
                <div className="mt-3 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-semibold text-muted mb-1">Message:</p>
                  <p className="text-sm text-app">{request.message}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleReview(request.request_id, "approved")}
                disabled={processingId === request.request_id}
                className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {processingId === request.request_id ? "..." : "Approve"}
              </button>
              <button
                onClick={() => handleReview(request.request_id, "denied")}
                disabled={processingId === request.request_id}
                className="rounded-md border border-red-600 px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {processingId === request.request_id ? "..." : "Deny"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
