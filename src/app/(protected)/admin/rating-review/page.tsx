// Admin Rating Review Page
"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { getPendingRatingReviewsAction, submitRatingDecisionAction } from "./actions";
import { formatGrade } from "@/lib/grade";

type RatingInput = {
  result_id: number;
  athlete_id: string;
  username: string;
  full_name: string;
  event: string;
  mark: string;
  mark_seconds_adj: number | null;
  mark_metric: number | null;
  meet_date: string;
  meet_name: string;
  season: string;
  grade: number;
  class_year: number;
  gender: string;
  proof_url: string | null;
  wind: number | null;
  timing: string;
  status: string;
  auto_stars: number;
  has_proof: boolean;
  is_fat: boolean;
  is_wind_legal: boolean;
  is_recent: boolean;
  is_quality_meet: boolean;
  latest_decision: {
    decision: string;
    final_stars: number | null;
    reason: string;
    notes: string;
    decided_at: string;
  } | null;
  created_at: string;
};

export default function AdminRatingReviewPage() {
  const [reviews, setReviews] = useState<RatingInput[]>([]);
  const [selectedReview, setSelectedReview] = useState<RatingInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [decision, setDecision] = useState<"approve" | "decline" | "needs_info">("approve");
  const [finalStars, setFinalStars] = useState<3 | 4 | 5>(3);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; error?: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const result = await getPendingRatingReviewsAction();
      if (!alive) return;

      if (result.ok && result.reviews) {
        setReviews(result.reviews);
        if (result.reviews.length > 0 && !selectedReview) {
          setSelectedReview(result.reviews[0]);
          setFinalStars(Math.min(5, Math.max(3, result.reviews[0].auto_stars)) as 3 | 4 | 5);
        }
      }
      setLoading(false);
    })();

    return () => { alive = false; };
  }, []);

  const handleSelectReview = (review: RatingInput) => {
    setSelectedReview(review);
    setFinalStars(Math.min(5, Math.max(3, review.auto_stars)) as 3 | 4 | 5);
    setReason("");
    setNotes("");
    setSubmitResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview) return;

    const formData = new FormData();
    formData.append("result_id", String(selectedReview.result_id));
    formData.append("decision", decision);
    if (decision === "approve") {
      formData.append("final_stars", String(finalStars));
    }
    formData.append("reason", reason);
    if (notes) {
      formData.append("notes", notes);
    }

    startTransition(async () => {
      const result = await submitRatingDecisionAction(formData);
      setSubmitResult(result);

      if (result.ok) {
        // Refresh list
        const refreshResult = await getPendingRatingReviewsAction();
        if (refreshResult.ok && refreshResult.reviews) {
          setReviews(refreshResult.reviews);
          // Select next review
          const nextReview = refreshResult.reviews.find(r => r.result_id !== selectedReview.result_id);
          if (nextReview) {
            handleSelectReview(nextReview);
          } else {
            setSelectedReview(null);
          }
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <p>Loading rating reviews...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-app">Admin Rating Review</h1>
        <p className="mt-2 text-sm text-muted">
          Review results with auto-calculated star ratings. Auto stars are a signal, not the final decision.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Review Queue (Left Sidebar) */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-app bg-card p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-app">
              Pending Reviews ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <p className="text-sm text-muted">No pending reviews</p>
            ) : (
              <div className="space-y-2">
                {reviews.map((review) => (
                  <button
                    key={review.result_id}
                    onClick={() => handleSelectReview(review)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedReview?.result_id === review.result_id
                        ? "border-scarlet bg-scarlet/10"
                        : "border-app bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-app">{review.event}</span>
                      <span className="rounded-full bg-scarlet px-2 py-0.5 text-xs font-bold text-white">
                        {review.auto_stars}★
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-app">
                      {review.full_name || `@${review.username}`}
                    </p>
                    <p className="text-xs text-muted">
                      {review.mark} · {formatGrade(review.grade)} · {review.season}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Review Details (Main Content) */}
        <div className="lg:col-span-2">
          {!selectedReview ? (
            <div className="rounded-2xl border border-app bg-card p-8 text-center shadow-sm">
              <p className="text-muted">Select a result to review</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Result Summary */}
              <div className="rounded-2xl border border-app bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-app">{selectedReview.event}</h2>
                    <p className="mt-1 text-xl font-semibold text-app">{selectedReview.mark}</p>
                  </div>
                  <div className="text-right">
                    <div className="rounded-full bg-scarlet px-4 py-2 text-xl font-bold text-white">
                      {selectedReview.auto_stars}★ AUTO
                    </div>
                    <p className="mt-1 text-xs text-muted">Calculated rating</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-app pt-4">
                  <div>
                    <p className="text-xs text-muted">Athlete</p>
                    <Link
                      href={`/athletes/${selectedReview.username}`}
                      className="font-semibold text-scarlet hover:underline"
                    >
                      {selectedReview.full_name || `@${selectedReview.username}`}
                    </Link>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Grade · Class</p>
                    <p className="font-semibold text-app">
                      {formatGrade(selectedReview.grade)} · {selectedReview.class_year}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Meet</p>
                    <p className="font-semibold text-app">{selectedReview.meet_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Date · Season</p>
                    <p className="font-semibold text-app">
                      {new Date(selectedReview.meet_date).toLocaleDateString()} · {selectedReview.season}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quality Flags */}
              <div className="rounded-2xl border border-app bg-card p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-app">Quality Flags</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <QualityFlag
                    label="Proof"
                    value={selectedReview.has_proof}
                    link={selectedReview.proof_url}
                  />
                  <QualityFlag
                    label="FAT Timing"
                    value={selectedReview.is_fat}
                    detail={selectedReview.timing}
                  />
                  <QualityFlag
                    label="Wind Legal"
                    value={selectedReview.is_wind_legal}
                    detail={selectedReview.wind ? `${selectedReview.wind}m/s` : undefined}
                  />
                  <QualityFlag
                    label="Recent (180d)"
                    value={selectedReview.is_recent}
                  />
                  <QualityFlag
                    label="Quality Meet"
                    value={selectedReview.is_quality_meet}
                  />
                  <div className="rounded-lg border border-app bg-muted/30 p-3">
                    <p className="text-xs text-muted">Status</p>
                    <p className="font-semibold text-app">{selectedReview.status}</p>
                  </div>
                </div>
              </div>

              {/* Previous Decision (if exists) */}
              {selectedReview.latest_decision && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 dark:bg-amber-900/20">
                  <h3 className="mb-2 text-lg font-semibold text-amber-900 dark:text-amber-100">
                    Previous Decision
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-semibold">Decision:</span> {selectedReview.latest_decision.decision}
                    </p>
                    {selectedReview.latest_decision.final_stars && (
                      <p>
                        <span className="font-semibold">Stars:</span> {selectedReview.latest_decision.final_stars}★
                      </p>
                    )}
                    <p>
                      <span className="font-semibold">Reason:</span> {selectedReview.latest_decision.reason}
                    </p>
                    {selectedReview.latest_decision.notes && (
                      <p>
                        <span className="font-semibold">Notes:</span> {selectedReview.latest_decision.notes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Decision Form */}
              <form onSubmit={handleSubmit} className="rounded-2xl border border-app bg-card p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-app">Make Decision</h3>

                <div className="space-y-4">
                  {/* Decision Type */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-app">Decision</label>
                    <div className="flex gap-3">
                      {(["approve", "decline", "needs_info"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setDecision(opt)}
                          className={`flex-1 rounded-lg border px-4 py-2 font-semibold transition ${
                            decision === opt
                              ? "border-scarlet bg-scarlet text-white"
                              : "border-app bg-card text-app hover:bg-muted"
                          }`}
                        >
                          {opt === "approve" && "✓ Approve"}
                          {opt === "decline" && "✗ Decline"}
                          {opt === "needs_info" && "? Needs Info"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Final Stars (only for approve) */}
                  {decision === "approve" && (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-app">Final Stars</label>
                      <div className="flex gap-3">
                        {[3, 4, 5].map((stars) => (
                          <button
                            key={stars}
                            type="button"
                            onClick={() => setFinalStars(stars as 3 | 4 | 5)}
                            className={`flex-1 rounded-lg border px-4 py-2 font-semibold transition ${
                              finalStars === stars
                                ? "border-scarlet bg-scarlet text-white"
                                : "border-app bg-card text-app hover:bg-muted"
                            }`}
                          >
                            {stars}★
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reason */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-app">
                      Reason <span className="text-scarlet">*</span>
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-lg border border-app bg-card px-4 py-2 text-app"
                      placeholder="Brief reason for decision"
                      required
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-app">Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-lg border border-app bg-card px-4 py-2 text-app"
                      rows={3}
                      placeholder="Additional context or details"
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isPending || !reason}
                    className="w-full rounded-lg bg-scarlet px-6 py-3 font-semibold text-white transition hover:bg-scarlet/90 disabled:opacity-50"
                  >
                    {isPending ? "Submitting..." : "Submit Decision"}
                  </button>

                  {/* Result */}
                  {submitResult && (
                    <div
                      className={`rounded-lg border p-4 ${
                        submitResult.ok
                          ? "border-green-300 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100"
                          : "border-red-300 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100"
                      }`}
                    >
                      {submitResult.ok ? "Decision submitted successfully!" : `Error: ${submitResult.error}`}
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QualityFlag({
  label,
  value,
  detail,
  link
}: {
  label: string;
  value: boolean;
  detail?: string;
  link?: string | null;
}) {
  const content = (
    <div
      className={`rounded-lg border p-3 ${
        value
          ? "border-green-300 bg-green-50 dark:bg-green-900/20"
          : "border-gray-300 bg-gray-50 dark:bg-gray-800/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">{label}</p>
        <span className="text-lg">{value ? "✅" : "⚠️"}</span>
      </div>
      {detail && <p className="mt-1 text-xs font-semibold text-app">{detail}</p>}
    </div>
  );

  if (link && value) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="transition hover:opacity-80">
        {content}
      </a>
    );
  }

  return content;
}
