// src/app/(protected)/submit-result/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmSubmitAction, type ConfirmInput } from "./actions";
import ToSModal from "@/components/ToSModal";

type ParsedProof = {
  event: string;
  markText: string;
  markSeconds: number | null;
  timing: "FAT" | "hand" | null;
  wind: number | null;
  meetName: string;
  meetDate: string; // YYYY-MM-DD
  confidence?: number;
};

type IngestResponse = {
  ok: boolean;
  error?: string;
  source?: "athleticnet" | "milesplit" | "other";
  parsed?: ParsedProof | null;
  normalized?: ParsedProof | null;
};

export default function SubmitResultURLPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState(""); // NEW: optional pasted HTML fallback
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [blockCode, setBlockCode] = useState<string | null>(null);

  const [source, setSource] = useState<"athleticnet" | "milesplit" | "other">("athleticnet");
  const [editable, setEditable] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [parsed, setParsed] = useState(false);

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
  const [tosAccepted, setTosAccepted] = useState<boolean | null>(null); // null = loading
  const [showTosModal, setShowTosModal] = useState(false);

  // Check ToS acceptance on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tos/accept?action_type=submit_result");
        if (res.ok) {
          const data = await res.json();
          setTosAccepted(data.accepted);
          if (!data.accepted) {
            setShowTosModal(true);
          }
        } else {
          setTosAccepted(false);
          setShowTosModal(true);
        }
      } catch (error) {
        console.error("Failed to check ToS acceptance:", error);
        setTosAccepted(false);
        setShowTosModal(true);
      }
    })();
  }, []);

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/proofs/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Include optional pasted HTML — server will prefer it if present.
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
        // Keep fields READ-ONLY by default after successful parse
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
        // Store original data for comparison
        setOriginalData(p);
      } else {
        // Make fields editable so user can fill manually
        setEditable(true);
        setParsed(true);
        setErr(
          data.error ||
          "Parsed successfully, but no structured fields were returned. Please fill in the details below."
        );
        // keep any prior values, but ensure something visible
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

  // Check if user edited the parsed data
  function wasDataEdited(): boolean {
    if (!originalData) return true; // No original data = manually filled
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
    setErr(null);
    setBlockCode(null);

    if (source === "athleticnet") {
      try {
        const resp = await fetch("/api/athleticnet/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await resp.json();
        if (!resp.ok || !data?.ok) {
          const message = data?.error || "Unable to submit.";
          setErr(message);
          return;
        }
        router.push("/me");
        return;
      } catch (e: any) {
        setErr(e?.message || "Unable to submit.");
        return;
      }
    }

    const wasEdited = wasDataEdited();
    const payload: ConfirmInput & { wasEdited?: boolean; originalData?: ParsedProof | null } = {
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
    const res = await confirmSubmitAction(payload);
    if (res?.ok) {
      router.push("/me");
    } else {
      const msg =
        res?.error?.formErrors?.join(" ") ||
        "Unable to submit. Please check the fields.";
      setErr(msg);
      if (res?.code) setBlockCode(res.code);
    }
  }

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
          router.push("/");
        }}
      />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-2">Submit a Result (Paste Link)</h1>
      <p className="text-sm text-gray-500 mb-6">
        Paste an Athletic.net result link. If the site blocks us, paste the page HTML below and we’ll parse that instead.
      </p>

      <form onSubmit={handleParse} className="space-y-3 mb-6">
        <div className="flex gap-3">
          <input
            type="url"
            className="flex-1 rounded-lg border px-3 py-2"
            placeholder="https://www.athletic.net/TrackAndField/meet/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Parsing…" : "Parse"}
          </button>
        </div>

        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Paste page HTML (optional)
          </summary>
          <p className="mt-2 text-xs text-gray-500">
            If parsing fails due to a generic/blocked page, open the result in your browser, view page source, copy all, and paste it here.
          </p>
          <textarea
            className="mt-2 w-full min-h-[140px] rounded-lg border px-3 py-2 font-mono text-xs"
            placeholder="<!doctype html>…"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
          />
        </details>
      </form>

      {err && (
        <div className="mb-4 space-y-3 rounded-md border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-700">
          <p>{err}</p>
          {blockCode === "ATHLETICNET_REQUIRED" ? (
            <div className="rounded-xl border border-red-200 bg-white/70 p-3 text-xs text-red-700">
              <p className="font-semibold">Next steps:</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>
                  Visit <a className="underline" href="/me#linked-profiles">Linked Athletic.net profiles</a> in your account settings.
                </li>
                <li>Paste your Athletic.net profile URL, copy the verification code, and add it to your profile.</li>
                <li>Click “Check verification”, then return here and resubmit your result.</li>
              </ol>
            </div>
          ) : null}
        </div>
      )}

      {/* Edit Warning Modal */}
      {showEditWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-w-md rounded-xl border bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Edit this result?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Editing parsed fields will trigger <strong>manual review</strong> by an admin before your result is approved.
              The original Athletic.net data will be preserved for comparison.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowEditWarning(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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

      <div className="rounded-xl border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Preview</h2>
          <div className="flex items-center gap-3">
            {typeof confidence === "number" && (
              <span className="text-xs text-gray-500">
                Confidence: {(confidence * 100).toFixed(0)}%
              </span>
            )}
            {parsed && !editable && (
              <button
                onClick={() => setShowEditWarning(true)}
                className="rounded-lg border border-amber-600 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
              >
                Edit result?
              </button>
            )}
            {editable && originalData && (
              <span className="text-xs text-amber-600 font-medium">
                ⚠ Manual review required
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Source</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
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
            <label className="block text-sm font-medium mb-1">Event</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              disabled={!editable}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mark (display)</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={markText}
              onChange={(e) => setMarkText(e.target.value)}
              disabled={!editable}
              placeholder='e.g., "14.76", "4:12.31", "6-02"'
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mark (seconds)</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-lg border px-3 py-2"
              value={markSeconds ?? ""}
              onChange={(e) =>
                setMarkSeconds(e.target.value === "" ? null : Number(e.target.value))
              }
              disabled={!editable}
              placeholder="Leave blank for field events"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Timing</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
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
            <label className="block text-sm font-medium mb-1">Wind (m/s)</label>
            <input
              type="number"
              step="0.1"
              className="w-full rounded-lg border px-3 py-2"
              value={wind ?? ""}
              onChange={(e) =>
                setWind(e.target.value === "" ? null : Number(e.target.value))
              }
              disabled={!editable}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Season</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={season}
              onChange={(e) => setSeason(e.target.value as "indoor" | "outdoor")}
              disabled={!editable}
            >
              <option value="outdoor">Outdoor</option>
              <option value="indoor">Indoor</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Meet Name</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={meetName}
              onChange={(e) => setMeetName(e.target.value)}
              disabled={!editable}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Meet Date</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2"
              value={meetDate}
              onChange={(e) => setMeetDate(e.target.value)}
              disabled={!editable}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button className="btn" onClick={handleConfirm}>
            Confirm & Submit
          </button>
          <span className="text-xs text-gray-500">
            {editable && originalData ? (
              <>Result will be marked <strong className="text-amber-600">manual review</strong> (edited data)</>
            ) : (
              <>Result will be marked <strong>pending</strong> for admin verification</>
            )}
          </span>
        </div>
      </div>
    </div>
    </>
  );
}
