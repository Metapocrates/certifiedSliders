"use client";

import { useState } from "react";
import { removeFromWatchlist } from "@/actions/coach-watchlist";

type Props = {
  watchlistId: string;
  athleteName: string;
};

export default function WatchlistRemoveButton({ watchlistId, athleteName }: Props) {
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleRemove() {
    if (!confirm(`Remove ${athleteName} from your watchlist?`)) return;

    setIsRemoving(true);
    try {
      const result = await removeFromWatchlist(watchlistId);
      if (!result.success) {
        alert(result.error || "Failed to remove from watchlist");
      }
      // Page will revalidate automatically
    } catch {
      alert("An error occurred");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={isRemoving}
      className="text-xs text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
    >
      {isRemoving ? "Removing..." : "Remove"}
    </button>
  );
}
