// src/app/(protected)/submit-result/SubmitResultForm.tsx
"use client";

import { useState } from "react";

type IngestOk = {
  ok: true;
  status: "pending" | "verified" | "blocked_until_verified";
  confidence?: number;            // 0..1
  resultId?: number;
  proofId?: string | number | null;
  event?: string;
  mark_seconds?: number | null;
  mark_seconds_adj?: number | null; // <— NEW in API response
  timing?: "FAT" | "hand" | null;
  meet?: string | null;
  date?: string | null;           // ISO
  message?: string;
  duplicate?: boolean;
};

type IngestErr = {
  ok: false;
  error: { message?: string; code?: string; details?: string; hint?: string } | string;
};

function fmtSeconds(s: number | null | undefined) {
  if (s == null) return "—";
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const rem = s - m * 60;
    return `${m}:${rem.toFixed(2).padStart(5, "0")}`;
  }
  return s.toFixed(2);
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function SubmitResultForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<IngestOk | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setResp(null);
    setLoading(true);
    try {
      const r = await fetch("/api/proofs/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await r.json()) as IngestOk | IngestErr;
      if (!("ok" in data)) throw new Error("Unexpected response");
      if (data.ok) setResp(data as IngestOk);
      else {
        const msg =
          typeof data.error === "string"
            ? data.error
            : data.error.message || data.error.details || "Submission failed.";
        setErr(msg);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setUrl("");
    setResp(null);
    setErr(null);
  }

  const pct = resp?.confidence != null ? Math.round(resp.confidence * 100) : null;
  const secondsToShow = resp?.mark_seconds_adj ?? resp?.mark_seconds ?? null;

  return (
    <div className="max-w-2xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Result link (Athletic.net or MileSplit)</label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            placeholder="https://www.athletic.net/TrackAndField/meet/..."
          />
        </div>

        <div className="flex items-center gap-3">
          <button disabled={loading} className="rounded-md px-4 py-2 bg-black text-app">
            {loading ? "Submitting…" : "Submit"}
          </button>
          {resp || err ? (
            <button type="button" onClick={resetForm} className="rounded-md px-4 py-2 border">
              Submit another
            </button>
          ) : null}
        </div>
      </form>

      {/* Errors */}
      {err ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {/* Success / Duplicate / Blocked summaries */}
      {resp ? (
        <div className="mt-6 rounded-md border p-4 bg-card">
          {/* Duplicate helper */}
          {resp.duplicate ? (
            <div className="mb-3 text-sm">
              You already submitted this link. Status: <b>{resp.status}</b>
              {pct != null ? <> • Confidence: <b>{pct}%</b></> : null}
              {" · "}
              <a className="underline underline-offset-2" href="/admin">Open Admin</a>
            </div>
          ) : null}

          {/* Main receipt */}
          <div className="text-sm">
            <div className="mb-1">
              Status: <b>{resp.status}</b>
              {pct != null ? <> • Confidence: <b>{pct}%</b></> : null}
            </div>

            {resp.status === "blocked_until_verified" && resp.message ? (
              <div className="mb-3 text-amber-700">{resp.message}</div>
            ) : null}

            <div className="text-lg font-medium">
              {resp.event ?? "—"} — {fmtSeconds(secondsToShow)}
            </div>
            <div className="subtle">{resp.meet ?? "—"} • {fmtDate(resp.date)}</div>

            <div className="mt-3 text-xs">
              {resp.resultId ? <>Result #{resp.resultId}</> : null}
              {resp.proofId ? <>{resp.resultId ? " • " : ""}Proof #{resp.proofId}</> : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/admin" className="rounded-md px-3 py-1.5 border text-sm">Review in Admin</a>
              <a href="/rankings" className="rounded-md px-3 py-1.5 border text-sm">View Rankings</a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
