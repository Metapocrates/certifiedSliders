"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmSubmitAction, type ConfirmInput } from "./actions";

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
  parsed?: ParsedProof | null;
  normalized?: ParsedProof | null;
};

export default function SubmitResultURLPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    setEditable(false);

    try {
      const res = await fetch("/api/proofs/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (res.status === 401) {
        setErr("You must be signed in to submit results.");
        setLoading(false);
        return;
      }

      const data: IngestResponse = await res.json();

      if (!data.ok) {
        setErr(data.error || "Could not parse this URL. You can still edit and submit manually.");
        setEditable(true);
        return;
      }

      if (data.source) setSource(data.source);

      // Prefer normalized, then parsed; if neither present, enable manual edit
      const p = data.normalized ?? data.parsed ?? null;

      if (!p) {
        // No structured fields were returned. Enable editing & show info.
        setEditable(true);
        setInfo(
          "Parsed successfully, but no structured fields were returned. Please fill in the details below."
        );

        // Clear any previous values so you start fresh
        setEvent("");
        setMarkText("");
        setMarkSeconds(null);
        setTiming(null);
        setWind(null);
        setMeetName("");
        setMeetDate("");
        setConfidence(undefined);
        return;
      }

      // Fill fields from payload
      setEvent(p.event ?? "");
      setMarkText(p.markText ?? "");
      setMarkSeconds(p.markSeconds ?? null);
      setTiming(p.timing ?? null);
      setWind(p.wind ?? null);
      setMeetName(p.meetName ?? "");
      setMeetDate(p.meetDate ?? "");
      setConfidence(p.confidence);

      // Keep read-only by default when we have a parse
      setEditable(false);
      setInfo("Parsed successfully. Review and continue.");
    } catch (e: any) {
      setErr(e?.message || "Unexpected error parsing URL.");
      setEditable(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setErr(null);
    setInfo(null);

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

      <form onSubmit={handleParse} className="flex gap-3 mb-6">
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
      </form>

      {err && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
      {info && (
        <div className="mb-4 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {info}
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
