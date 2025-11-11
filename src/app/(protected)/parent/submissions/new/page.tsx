// src/app/(protected)/parent/submissions/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmParentSubmitAction, type ParentConfirmInput } from "./actions";
import ToSModal from "@/components/ToSModal";

type ParsedProof = {
  event: string;
  markText: string;
  markSeconds: number | null;
  timing: "FAT" | "hand" | null;
  wind: number | null;
  meetName: string;
  meetDate: string;
  confidence?: number;
};

type IngestResponse = {
  ok: boolean;
  error?: string;
  source?: "athleticnet" | "milesplit" | "other";
  parsed?: ParsedProof | null;
  normalized?: ParsedProof | null;
};

type LinkedAthlete = {
  id: string;
  athlete_id: string;
  profile: {
    full_name: string | null;
    username: string | null;
    profile_id: string | null;
  };
};

export default function ParentSubmitResultPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [blockCode, setBlockCode] = useState<string | null>(null);

  const [source, setSource] = useState<"athleticnet" | "milesplit" | "other">("athleticnet");
  const [editable, setEditable] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [parsed, setParsed] = useState(false);

  // Athlete selection
  const [linkedAthletes, setLinkedAthletes] = useState<LinkedAthlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [loadingAthletes, setLoadingAthletes] = useState(true);

  // Editable preview fields
  const [event, setEvent] = useState("");
  const [markText, setMarkText] = useState("");
  const [markSeconds, setMarkSeconds] = useState<number | null>(null);
  const [timing, setTiming] = useState<"FAT" | "hand" | null>(null);
  const [wind, setWind] = useState<number | null>(null);
  const [season, setSeason] = useState<"indoor" | "outdoor">("outdoor");
  const [meetName, setMeetName] = useState("");
  const [meetDate, setMeetDate] = useState("");
  const [confidence, setConfidence] = useState<number | undefined>(undefined);

  // Track original parsed values to detect edits
  const [originalData, setOriginalData] = useState<ParsedProof | null>(null);

  // ToS gate
  const [tosAccepted, setTosAccepted] = useState<boolean | null>(null);
  const [showTosModal, setShowTosModal] = useState(false);

  // Fetch linked athletes on mount
  useEffect(() => {
    (async () => {
      setLoadingAthletes(true);
      try {
        // Check ToS acceptance
        const tosRes = await fetch("/api/tos/accept?action_type=submit_result");
        if (tosRes.ok) {
          const tosData = await tosRes.json();
          setTosAccepted(tosData.accepted);
          if (!tosData.accepted) {
            setShowTosModal(true);
          }
        } else {
          setTosAccepted(false);
          setShowTosModal(true);
        }

        // Fetch linked athletes
        const res = await fetch("/api/parent/linked-athletes");
        if (res.ok) {
          const data = await res.json();
          setLinkedAthletes(data.athletes || []);
          if (data.athletes?.length === 1) {
            setSelectedAthleteId(data.athletes[0].athlete_id);
          }
        } else {
          setErr("Failed to load linked athletes. Please link an athlete first.");
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        setErr("Failed to load linked athletes. Please try again later.");
      } finally {
        setLoadingAthletes(false);
      }
    })();
  }, []);

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAthleteId) {
      setErr("Please select an athlete first.");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/proofs/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, html: html?.trim() ? html : undefined }),
      });

      if (res.status === 401) {
        setErr("You must be signed in to submit results.");
        setLoading(false);
        return;
      }

      const data: IngestResponse = await res.json();

      if (data.source) setSource(data.source);

      const p = data.normalized ?? data.parsed ?? null;
      if (data.ok && p) {
        setEditable(false);
        setParsed(true);
        setEvent(p.event ?? "");
        setMarkText(p.markText ?? "");
        setMarkSeconds(p.markSeconds ?? null);
        setTiming(p.timing ?? null);
        setWind(p.wind ?? null);
        setMeetName(p.meetName ?? "");
        setMeetDate(p.meetDate ?? "");
        setConfidence(p.confidence);
        setOriginalData(p);
      } else {
        setEditable(true);
        setParsed(true);
        setErr(
          data.error ||
          "Parsed successfully, but no structured fields were returned. Please fill in the details below."
        );
        if (!p) {
          setEvent("");
          setMarkText("");
          setMarkSeconds(null);
          setTiming(null);
          setWind(null);
          setMeetName("");
          setMeetDate("");
          setConfidence(undefined);
        }
        setOriginalData(null);
      }
    } catch (e: any) {
      setErr(e?.message || "Unexpected error parsing URL.");
      setEditable(true);
    } finally {
      setLoading(false);
    }
  }

  function wasDataEdited(): boolean {
    if (!originalData) return true;
    return (
      event !== (originalData.event ?? "") ||
      markText !== (originalData.markText ?? "") ||
      markSeconds !== originalData.markSeconds ||
      timing !== originalData.timing ||
      wind !== originalData.wind ||
      meetName !== (originalData.meetName ?? "") ||
      meetDate !== (originalData.meetDate ?? "")
    );
  }

  async function handleConfirm() {
    if (!selectedAthleteId) {
      setErr("Please select an athlete.");
      return;
    }

    setErr(null);
    setBlockCode(null);

    if (source === "athleticnet") {
      setErr("Athletic.net submissions are not yet supported for parent accounts. Please use MileSplit or Other.");
      return;
    }

    const wasEdited = wasDataEdited();
    const payload: ParentConfirmInput = {
      athleteId: selectedAthleteId,
      source,
      proofUrl: url,
      event,
      markText,
      markSeconds,
      timing,
      wind,
      season,
      meetName,
      meetDate,
      wasEdited,
      originalData,
      confidence,
    };
    const res = await confirmParentSubmitAction(payload);
    if (res?.ok) {
      router.push("/parent/submissions");
    } else {
      const msg =
        res?.error?.formErrors?.join(" ") ||
        "Unable to submit. Please check the fields.";
      setErr(msg);
      if (res?.code) setBlockCode(res.code);
    }
  }

  const getAthleteDisplayName = (athlete: LinkedAthlete) => {
    return (
      athlete.profile.full_name ||
      athlete.profile.username ||
      athlete.profile.profile_id ||
      "Unknown Athlete"
    );
  };

  return (
    <>
      <ToSModal
        isOpen={showTosModal}
        actionType="submit_result"
        onAccept={() => {
          setTosAccepted(true);
          setShowTosModal(false);
        }}
        onDecline={() => {
          router.push("/parent/dashboard");
        }}
      />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">Submit Result for Athlete</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Submit a result on behalf of your linked athlete. Paste a MileSplit result link or enter manually.
        </p>

        {/* Athlete Selection */}
        {loadingAthletes ? (
          <div className="mb-6 rounded-lg border border-app bg-card p-4">
            <p className="text-sm text-muted">Loading linked athletes...</p>
          </div>
        ) : linkedAthletes.length === 0 ? (
          <div className="mb-6 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              You don&apos;t have any linked athletes yet. Please{" "}
              <a href="/parent/onboarding" className="font-semibold underline">
                link an athlete
              </a>{" "}
              before submitting results.
            </p>
          </div>
        ) : (
          <div className="mb-6 rounded-lg border border-app bg-card p-4">
            <label className="block text-sm font-medium mb-2 text-app">
              Select Athlete
            </label>
            <select
              className="w-full rounded-lg border border-app px-3 py-2 bg-background text-app"
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              disabled={linkedAthletes.length === 1}
            >
              {linkedAthletes.length > 1 && <option value="">Choose athlete...</option>}
              {linkedAthletes.map((athlete) => (
                <option key={athlete.id} value={athlete.athlete_id}>
                  {getAthleteDisplayName(athlete)}
                  {athlete.profile.profile_id && ` (${athlete.profile.profile_id})`}
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleParse} className="space-y-3 mb-6">
          <div className="flex gap-3">
            <input
              type="url"
              className="flex-1 rounded-lg border border-app px-3 py-2 bg-background text-app"
              placeholder="https://www.milesplit.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={!selectedAthleteId || linkedAthletes.length === 0}
            />
            <button
              type="submit"
              className="btn"
              disabled={loading || !selectedAthleteId || linkedAthletes.length === 0}
            >
              {loading ? "Parsing…" : "Parse"}
            </button>
          </div>

          <details className="rounded-lg border border-app p-3">
            <summary className="cursor-pointer text-sm font-medium text-app">
              Paste page HTML (optional)
            </summary>
            <p className="mt-2 text-xs text-muted">
              If parsing fails due to a generic/blocked page, open the result in your browser, view
              page source, copy all, and paste it here.
            </p>
            <textarea
              className="mt-2 w-full min-h-[140px] rounded-lg border border-app px-3 py-2 font-mono text-xs bg-background text-app"
              placeholder="<!doctype html>…"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              disabled={!selectedAthleteId || linkedAthletes.length === 0}
            />
          </details>
        </form>

        {err && (
          <div className="mb-4 space-y-3 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-3 text-sm text-red-700 dark:text-red-200">
            <p>{err}</p>
          </div>
        )}

        {/* Edit Warning Modal */}
        {showEditWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-w-md rounded-xl border bg-white dark:bg-gray-900 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Edit this result?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Editing parsed fields will trigger <strong>manual review</strong> by an admin before
                the result is approved. The original data will be preserved for comparison.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowEditWarning(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setEditable(true);
                    setShowEditWarning(false);
                  }}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                >
                  I understand, let me edit
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-app p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-app">Preview</h2>
            <div className="flex items-center gap-3">
              {typeof confidence === "number" && (
                <span className="text-xs text-muted">
                  Confidence: {(confidence * 100).toFixed(0)}%
                </span>
              )}
              {parsed && !editable && (
                <button
                  onClick={() => setShowEditWarning(true)}
                  className="rounded-lg border border-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                >
                  Edit result?
                </button>
              )}
              {editable && originalData && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  ⚠ Manual review required
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-app">Source</label>
              <select
                className="w-full rounded-lg border border-app px-3 py-2 bg-background text-app"
                value={source}
                onChange={(e) =>
                  setSource(e.target.value as "athleticnet" | "milesplit" | "other")
                }
                disabled={!editable}
              >
                <option value="athleticnet">Athletic.net</option>
                <option value="milesplit">MileSplit</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-app">Event</label>
              <input
                className="w-full rounded-lg border border-app px-3 py-2 bg-background text-app"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                disabled={!editable}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-app">Mark (display)</label>
              <input
                className="w-full rounded-lg border border-app px-3 py-2 bg-background text-app"
                value={markText}
                onChange={(e) => setMarkText(e.target.value)}
                disabled={!editable}
                placeholder='e.g., "14.76", "4:12.31", "6-02"'
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-app">Mark (seconds)</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-app px-3 py-2 bg-background text-app"
                value={markSeconds ?? ""}
                onChange={(e) =>
                  setMarkSeconds(e.target.value === "" ? null : Number(e.target.value))
                }
                disabled={!editable}
                placeholder="Leave blank for field events"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-app">Timing</label>
              <select
                className="w-full rounded-lg border border-app px-3 py-2 bg-background text-app"
                value={timing ?? ""}
                onChange={(e) =>
                  setTiming((e.target.value || null) as "FAT" | "hand" | null)
                }
                disabled={!editable}
              >
                <option value="">—</option>
                <option value="FAT">FAT</option>
                <option value="hand">Hand</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-app">Wind (m/s)</label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-lg border border-app px-3 py-2 bg-background text-app"
                value={wind ?? ""}
                onChange={(e) =>
                  setWind(e.target.value === "" ? null : Number(e.target.value))
                }
                disabled={!editable}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-app">Season</label>
              <select
                className="w-full rounded-lg border border-app px-3 py-2 bg-background text-app"
                value={season}
                onChange={(e) => setSeason(e.target.value as "indoor" | "outdoor")}
                disabled={!editable}
              >
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1 text-app">Meet Name</label>
              <input
                className="w-full rounded-lg border border-app px-3 py-2 bg-background text-app"
                value={meetName}
                onChange={(e) => setMeetName(e.target.value)}
                disabled={!editable}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-app">Meet Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-app px-3 py-2 bg-background text-app"
                value={meetDate}
                onChange={(e) => setMeetDate(e.target.value)}
                disabled={!editable}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              className="btn"
              onClick={handleConfirm}
              disabled={!selectedAthleteId || linkedAthletes.length === 0}
            >
              Confirm & Submit
            </button>
            <span className="text-xs text-muted">
              {editable && originalData ? (
                <>
                  Result will be marked <strong className="text-amber-600 dark:text-amber-400">manual review</strong> (edited data)
                </>
              ) : (
                <>
                  Result will be marked <strong>pending</strong> for admin verification
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
