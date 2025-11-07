"use client";

import { useState } from "react";

type VideoClip = {
  id: string;
  youtube_url: string;
  youtube_id: string | null;
  title: string | null;
  event_code: string | null;
  display_order: number;
};

type Props = {
  athleteId: string;
  initialClips: VideoClip[];
  maxClips?: number;
};

export default function VideoClipManager({ athleteId, initialClips, maxClips = 5 }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const canAddMore = initialClips.length < maxClips;

  async function handleAdd() {
    if (!youtubeUrl.trim()) {
      setError("YouTube URL is required");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/profile/video-clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athlete_id: athleteId,
          youtube_url: youtubeUrl.trim(),
          title: title.trim() || null,
          event_code: eventCode.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add video");
      }

      // Reset form
      setYoutubeUrl("");
      setTitle("");
      setEventCode("");
      setIsAdding(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(clipId: string) {
    if (!confirm("Remove this video clip?")) return;

    try {
      const response = await fetch("/api/profile/video-clips", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_id: clipId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove video");
      }

      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (!isAdding) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {initialClips.length} / {maxClips} videos
        </span>
        {canAddMore && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Add Video Clip
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="font-semibold text-app">Add Video Clip</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            YouTube URL *
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="State Championships 100m Final"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Event Code (optional)
          </label>
          <input
            type="text"
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value)}
            placeholder="100m, 4x100m, etc."
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={isSaving}
          className="rounded-md bg-black text-app px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {isSaving ? "Adding..." : "Add Video"}
        </button>
        <button
          onClick={() => {
            setIsAdding(false);
            setError("");
          }}
          disabled={isSaving}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>

      {initialClips.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Current Videos</h4>
          <div className="space-y-2">
            {initialClips.map((clip) => (
              <div key={clip.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{clip.title || clip.youtube_url}</span>
                <button
                  onClick={() => handleRemove(clip.id)}
                  className="text-red-600 hover:underline ml-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
