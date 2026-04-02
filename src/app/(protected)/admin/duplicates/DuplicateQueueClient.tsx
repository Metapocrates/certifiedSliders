"use client";

import { useState, useTransition } from "react";
import { resolveDuplicateAction } from "./actions";

type Candidate = {
  id: string;
  profile_id_a: string;
  profile_id_b: string;
  confidence: number;
  match_method: string;
  status: string;
  notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

type ProfileInfo = {
  full_name: string;
  slug: string;
  school_name?: string;
  class_year?: number;
};

type Props = {
  candidates: Candidate[];
  profileMap: Record<string, ProfileInfo>;
};

const STATUS_TABS = ["pending", "merged", "dismissed", "distinct"] as const;

function confidenceColor(c: number) {
  if (c >= 0.8) return "text-red-600 dark:text-red-400";
  if (c >= 0.6) return "text-amber-600 dark:text-amber-400";
  return "text-muted";
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    merged: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    dismissed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    distinct: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? ""}`}>
      {status}
    </span>
  );
}

export default function DuplicateQueueClient({ candidates, profileMap }: Props) {
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [busy, startTransition] = useTransition();
  const [notesInput, setNotesInput] = useState<Record<string, string>>({});

  const filtered = candidates.filter((c) => c.status === activeTab);

  function handleResolve(id: string, status: "merged" | "dismissed" | "distinct") {
    startTransition(async () => {
      await resolveDuplicateAction(id, status, notesInput[id]);
    });
  }

  function profileLabel(id: string) {
    const p = profileMap[id];
    if (!p) return id.slice(0, 8) + "…";
    const parts = [p.full_name];
    if (p.school_name) parts.push(p.school_name);
    if (p.class_year) parts.push(`'${String(p.class_year).slice(-2)}`);
    return parts.join(" · ");
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => {
          const count = candidates.filter((c) => c.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">
          No {activeTab} duplicate candidates.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border bg-card p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(c.status)}
                    <span className={`text-sm font-semibold ${confidenceColor(c.confidence)}`}>
                      {Math.round(c.confidence * 100)}% confidence
                    </span>
                    <span className="text-xs text-muted">
                      via {c.match_method.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    Detected {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Profile pair */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ProfileCard id={c.profile_id_a} info={profileMap[c.profile_id_a]} />
                <ProfileCard id={c.profile_id_b} info={profileMap[c.profile_id_b]} />
              </div>

              {/* Notes */}
              {c.notes && (
                <p className="text-xs text-muted bg-muted/50 rounded px-2 py-1">
                  Note: {c.notes}
                </p>
              )}

              {/* Actions (only for pending) */}
              {c.status === "pending" && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Optional notes…"
                    className="flex-1 min-w-[200px] rounded-md border bg-background px-2 py-1 text-sm"
                    value={notesInput[c.id] ?? ""}
                    onChange={(e) =>
                      setNotesInput((prev) => ({ ...prev, [c.id]: e.target.value }))
                    }
                  />
                  <button
                    disabled={busy}
                    onClick={() => handleResolve(c.id, "merged")}
                    className="rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Merge
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => handleResolve(c.id, "distinct")}
                    className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Distinct
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => handleResolve(c.id, "dismissed")}
                    className="rounded-md border px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Resolved info */}
              {c.resolved_at && (
                <p className="text-xs text-muted">
                  Resolved {new Date(c.resolved_at).toLocaleDateString()}
                  {c.resolved_by ? ` by ${c.resolved_by.slice(0, 8)}…` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileCard({ id, info }: { id: string; info?: ProfileInfo }) {
  if (!info) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-mono text-muted">{id.slice(0, 12)}…</p>
        <p className="text-xs text-muted">Profile not found</p>
      </div>
    );
  }

  return (
    <a
      href={`/athletes/${info.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border bg-muted/30 p-3 hover:border-primary transition"
    >
      <p className="text-sm font-semibold">{info.full_name}</p>
      <div className="flex gap-2 text-xs text-muted mt-0.5">
        {info.school_name && <span>{info.school_name}</span>}
        {info.class_year && <span>Class of {info.class_year}</span>}
      </div>
      <p className="text-xs font-mono text-muted mt-1">{id.slice(0, 12)}…</p>
    </a>
  );
}
