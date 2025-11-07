"use client";

import { useState } from "react";

type Props = {
  athleteId: string;
  currentVisibility: "private" | "coaches" | "public";
};

export default function BioVisibilitySelector({ athleteId, currentVisibility }: Props) {
  const [visibility, setVisibility] = useState(currentVisibility);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(newVisibility: "private" | "coaches" | "public") {
    setVisibility(newVisibility);
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile/bio-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athlete_id: athleteId,
          visibility: newVisibility,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }

      // Optionally reload to show updated state
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      setVisibility(currentVisibility); // Revert on error
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Visible to:</span>
      <select
        value={visibility}
        onChange={(e) => handleChange(e.target.value as any)}
        disabled={isSaving}
        className="text-xs rounded border border-border bg-card px-2 py-1"
      >
        <option value="private">Only me</option>
        <option value="coaches">Coaches</option>
        <option value="public">Everyone</option>
      </select>
    </div>
  );
}
