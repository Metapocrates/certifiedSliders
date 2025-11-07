"use client";

import { useState } from "react";

type Props = {
  contentType: "bio" | "video";
  contentId: string;  // profile_id for bio, clip id for video
  onFlagComplete?: () => void;
};

export default function FlagButton({ contentType, contentId, onFlagComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState("");

  async function handleFlag() {
    if (!showReasonInput) {
      setShowReasonInput(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/flag-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          reason: reason.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to flag content");
      }

      setFlagged(true);
      setShowReasonInput(false);
      onFlagComplete?.();
    } catch (err: any) {
      console.error("Error flagging content:", err);
      alert(err.message || "Failed to flag content");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setShowReasonInput(false);
    setReason("");
  }

  if (flagged) {
    return (
      <div className="text-xs text-muted-foreground">
        Flagged for review
      </div>
    );
  }

  if (showReasonInput) {
    return (
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="text-xs border rounded px-2 py-1"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={handleFlag}
            disabled={loading}
            className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Flagging..." : "Submit Flag"}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-xs px-3 py-1 border rounded hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowReasonInput(true)}
      className="text-xs text-red-600 hover:underline"
    >
      Flag for review
    </button>
  );
}
