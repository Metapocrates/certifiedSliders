"use client";

import { useState } from "react";

type Props = {
  initialData?: {
    gpa: number | null;
    sat_score: number | null;
    act_score: number | null;
    share_with_coaches: boolean;
  };
  athleteId: string;
  onSave?: () => void;
};

export default function AcademicInfoEditor({ initialData, athleteId, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [gpa, setGpa] = useState(initialData?.gpa?.toString() || "");
  const [satScore, setSatScore] = useState(initialData?.sat_score?.toString() || "");
  const [actScore, setActScore] = useState(initialData?.act_score?.toString() || "");
  const [shareWithCoaches, setShareWithCoaches] = useState(initialData?.share_with_coaches ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const hasAnyData = initialData && (initialData.gpa || initialData.sat_score || initialData.act_score);

  async function handleSave() {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/profile/academic-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athlete_id: athleteId,
          gpa: gpa ? parseFloat(gpa) : null,
          sat_score: satScore ? parseInt(satScore, 10) : null,
          act_score: actScore ? parseInt(actScore, 10) : null,
          share_with_coaches: shareWithCoaches,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      setIsEditing(false);
      onSave?.();
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="text-sm text-blue-600 hover:underline font-medium"
      >
        {hasAnyData ? "Edit Academic Info" : "Add Academic Info"}
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="font-semibold text-app">Manage Academic Information</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            GPA (0.0 - 4.0)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="4"
            value={gpa}
            onChange={(e) => setGpa(e.target.value)}
            placeholder="3.50"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            SAT Score (400-1600)
          </label>
          <input
            type="number"
            min="400"
            max="1600"
            value={satScore}
            onChange={(e) => setSatScore(e.target.value)}
            placeholder="1200"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            ACT Score (1-36)
          </label>
          <input
            type="number"
            min="1"
            max="36"
            value={actScore}
            onChange={(e) => setActScore(e.target.value)}
            placeholder="28"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="share-academic"
          checked={shareWithCoaches}
          onChange={(e) => setShareWithCoaches(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="share-academic" className="text-sm text-muted-foreground">
          Share with coaches from programs I&apos;m interested in
        </label>
      </div>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-black text-app px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => setIsEditing(false)}
          disabled={isSaving}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
