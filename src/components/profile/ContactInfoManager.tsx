"use client";

import { useState } from "react";

type Props = {
  athleteId: string;
  initialData: {
    email: string | null;
    phone: string | null;
    share_contact_info: boolean;
  };
};

export default function ContactInfoManager({ athleteId, initialData }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState(initialData.email || "");
  const [phone, setPhone] = useState(initialData.phone || "");
  const [shareContactInfo, setShareContactInfo] = useState(initialData.share_contact_info);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/profile/contact-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athlete_id: athleteId,
          email: email.trim() || null,
          phone: phone.trim() || null,
          share_contact_info: shareContactInfo,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      setIsEditing(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {initialData.email || initialData.phone ? (
            <>
              Contact info {shareContactInfo ? "shared with coaches" : "private"}
            </>
          ) : (
            "No contact info added"
          )}
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          Edit Contact Info
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="font-semibold text-app">Manage Contact Information</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="share-contact"
          checked={shareContactInfo}
          onChange={(e) => setShareContactInfo(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="share-contact" className="text-sm text-muted-foreground">
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
