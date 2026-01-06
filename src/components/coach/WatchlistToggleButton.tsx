"use client";

import { useState } from "react";
import { addToWatchlist, removeFromWatchlistByAthlete } from "@/actions/coach-watchlist";

type Props = {
  athleteProfileId: string;
  isOnWatchlist: boolean;
  compact?: boolean;
};

export default function WatchlistToggleButton({
  athleteProfileId,
  isOnWatchlist: initialOnWatchlist,
  compact = false,
}: Props) {
  const [isOnWatchlist, setIsOnWatchlist] = useState(initialOnWatchlist);
  const [isPending, setIsPending] = useState(false);

  async function handleToggle() {
    setIsPending(true);
    try {
      if (isOnWatchlist) {
        const result = await removeFromWatchlistByAthlete(athleteProfileId);
        if (result.success) {
          setIsOnWatchlist(false);
        } else {
          alert(result.error || "Failed to remove from watchlist");
        }
      } else {
        const result = await addToWatchlist(athleteProfileId);
        if (result.success) {
          setIsOnWatchlist(true);
        } else {
          alert(result.error || "Failed to add to watchlist");
        }
      }
    } catch {
      alert("An error occurred");
    } finally {
      setIsPending(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`p-1.5 rounded transition ${
          isOnWatchlist
            ? "text-amber-500 hover:text-amber-600"
            : "text-gray-400 hover:text-amber-500"
        } disabled:opacity-50`}
        title={isOnWatchlist ? "Remove from watchlist" : "Add to watchlist"}
      >
        <svg
          className="h-5 w-5"
          fill={isOnWatchlist ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
        isOnWatchlist
          ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
          : "bg-gray-100 text-gray-700 hover:bg-amber-50 hover:text-amber-700"
      } disabled:opacity-50`}
    >
      <svg
        className="h-4 w-4"
        fill={isOnWatchlist ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
      {isPending
        ? "..."
        : isOnWatchlist
        ? "On Watchlist"
        : "Add to Watchlist"}
    </button>
  );
}
