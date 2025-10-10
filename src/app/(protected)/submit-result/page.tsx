// src/app/(protected)/submit-result/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmSubmitAction, type ConfirmInput } from "./actions";
import ParseFromUrl from "./ParseFromUrl"; // ✅ Step 2: use the parser UI

type ParsedProof = {
  event: string;
  markText: string;
  markSeconds: number | null;
  timing: "FAT" | "Hand" | null;
  wind: number | null;
  meetName: string;
  meetDate: string; // YYYY-MM-DD
  confidence?: number;
};

type IngestResponse = {
  ok: boolean;
  error?: string;
  source?: "athleticnet" | "milesplit" | "other";
  parsed?: ParsedProof;
  normalized?: {
    event: string;
    markText: string;
    markSeconds: number | null;
    timing: "FAT" | "Hand" | null;
    wind: number | null;
    meetName: string;
    meetDate: string; // YYYY-MM-DD
    confidence?: number;
  };
};

export default function SubmitResultURLPage() {
  const router = useRouter();

  // Proof URL to submit (filled by parser and still editable)
  const [url, setUrl] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [source, setSource] = useState<"athleticnet" | "milesplit" | "other">("athleticnet");
  const [editable, setEditable] = useState(false);

  // Editable preview fields
  const [event, setEvent] = useState("");
  const [markText, setMarkText] = useState("");
  const [markSeconds, setMarkSeconds] = useState<number | null>(null);
  const [timing, setTiming] = useState<"FAT" | "Hand" | null>(null);
  const [wind, setWind] = useState<number | null>(null);
  const [season, setSeason] = useState<"indoor" | "outdoor">("outdoor");
  const [meetName, setMeetName] = useState("");
  const [meetDate, setMeetDate] = useState("");
  const [confidence, setConfidence] = useState<number | undefined>(undefined);

  // ✅ Step 2: when ParseFromUrl succeeds, prefill our local state
  function handleParsed(data?: any) {
    setErr(null);

    // If the API echoes a source or proof url, capture them
    if (typeof data?.proof_url === "string") setUrl(data.proof_url);
    if (typeof data?.source === "string" && (["athleticnet","milesplit","other"] as const).includes(data.source)) {
      setSource(data.source);
    }

    setEvent(data?.event ?? "");
    setMarkText(data?.mark ?? data?.markText ?? "");
    setMarkSeconds(
      typeof data?.mark_seconds_adj === "number"
        ? data.mark_seconds_adj
        : typeof data?.markSeconds === "number"
        ? data.markSeconds
        : null
    );
    setTiming(
      data?.timing === "FAT" || data?.timing === "Hand" ? data.timing : null
    );
    setWind(
      typeof data?.wind === "number" ? data.wind : null
    );
    setMeetName(data?.meet_name ?? data?.meetName ?? "");
    setMeetDate(data?.meet_date ?? data?.meetDate ?? "");
    setConfidence(
      typeof data?.confidence === "number" ? data.confidence : undefined
    );

    // Let user tweak after parsing
    setEditable(true);
  }

  async function handleConfirm() {
    setErr(null);
    const payload: ConfirmInput = {
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
    };
    const res = await confirmSubmitAction(payload);
    if (res?.ok) {
      router.push("/me");
    } else {
      const msg =
        res?.error?.formErrors?.join(" ") ||
        "Unable to submit. Please check the fields.";
      setErr(msg);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">Submit a Result (Paste Link)</h1>
      <p className="text-sm text-gray-500 mb-6">
        Paste an Athletic.net or MileSplit result link. We’ll parse the details; you can edit before confirming.
      </p>

      {/* ✅ Step 2: modern parser UI (calls /api/proofs/ingest) */}
      <ParseFromUrl onParsed={handleParsed} />

      {err && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="mt-4 rounded-xl border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Preview</h2>
          <div className="flex items-center gap-3">
            {typeof confidence === "number" && (
              <span className="text-xs text-gray-500">
                Confidence: {(confidence * 100).toFixed(0)}%
              </span>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editable}
                onChange={(e) => setEditable(e.target.checked)}
              />
              Edit fields
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Proof URL stays visible & editable so the user can confirm it */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Proof URL</label>
            <input
              type="url"
              className="w-full rounded-lg border px-3 py-2"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={!editable}
              placeholder="https://www.athletic.net/TrackAndField/meet/..."
            />
          </div>

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
                setTiming((e.target.value || null) as "FAT" | "Hand" | null)
              }
              disabled={!editable}
            >
              <option value="">—</option>
              <option value="FAT">FAT</option>
              <option value="Hand">Hand</option>
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

        <div className="flex items-center gap-3">
          <button className="btn" onClick={handleConfirm}>
            Confirm & Submit
          </button>
          <span className="text-xs text-gray-500">
            Your result will be marked <strong>pending</strong> for admin verification.
          </span>
        </div>
      </div>
    </div>
  );
}
