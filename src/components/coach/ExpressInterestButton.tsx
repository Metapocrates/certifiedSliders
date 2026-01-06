"use client";

import { useState } from "react";
import { expressInterest, withdrawInterest } from "@/actions/coach-interest";

type Props = {
  athleteProfileId: string;
  athleteName: string;
  programId: string;
  programName: string;
  currentStatus?: string;
  compact?: boolean;
};

export default function ExpressInterestButton({
  athleteProfileId,
  athleteName,
  programId,
  programName,
  currentStatus,
  compact = false,
}: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  const hasExpressed = status === "expressed";
  const isWithdrawn = status === "withdrawn";

  async function handleExpress() {
    setIsPending(true);
    const result = await expressInterest(athleteProfileId, programId, message);
    if (result.success) {
      setStatus("expressed");
      setIsOpen(false);
      setMessage("");
    } else {
      alert(result.error || "Failed to express interest");
    }
    setIsPending(false);
  }

  async function handleWithdraw() {
    if (!confirm("Withdraw your interest in this athlete?")) return;
    setIsPending(true);
    const result = await withdrawInterest(athleteProfileId);
    if (result.success) {
      setStatus("withdrawn");
    } else {
      alert(result.error || "Failed to withdraw interest");
    }
    setIsPending(false);
  }

  // Compact button for table view
  if (compact) {
    if (hasExpressed) {
      return (
        <button
          onClick={handleWithdraw}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
          title="Interest expressed - click to withdraw"
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          Expressed
        </button>
      );
    }

    if (isWithdrawn) {
      return (
        <button
          onClick={() => setIsOpen(true)}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50"
        >
          Re-express
        </button>
      );
    }

    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Express Interest
        </button>

        {/* Modal */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
              <h3 className="text-lg font-semibold">Express Interest</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Let {athleteName} know that {programName} is interested in recruiting them.
              </p>

              <div className="mt-4">
                <label className="block text-sm font-medium">Optional Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal message to the athlete..."
                  className="mt-1 w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                  rows={3}
                  maxLength={500}
                />
                <div className="mt-1 text-xs text-gray-500">{message.length}/500</div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setMessage("");
                  }}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExpress}
                  disabled={isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? "Sending..." : "Express Interest"}
                </button>
              </div>

              <p className="mt-4 text-xs text-gray-500">
                The athlete will be notified that your program is interested in them.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Full button for non-compact view
  return (
    <button
      onClick={hasExpressed ? handleWithdraw : () => setIsOpen(true)}
      disabled={isPending}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
        hasExpressed
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-blue-600 text-white hover:bg-blue-700"
      } disabled:opacity-50`}
    >
      {hasExpressed ? (
        <>
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          Interest Expressed
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Express Interest
        </>
      )}
    </button>
  );
}
