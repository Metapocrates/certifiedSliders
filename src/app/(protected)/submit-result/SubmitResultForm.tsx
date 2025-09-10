"use client";

import { useState } from "react";
import ResultCard from "@/components/proofs/ResultCard";

type IngestResponse = {
  ok: boolean;
  status?: string;
  confidence?: number;
  proofId?: number;
  resultId?: number;
  event?: string | null;
  mark_seconds?: number | null;
  timing?: "FAT" | "hand" | null;
  meet?: string | null;
  date?: string | null;
  // match ResultCard expectations
  error?: string | { message?: string } | null;
};

function extractErrorText(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const o = err as Record<string, any>;
    if (typeof o.message === "string") return o.message;
    try {
      return JSON.stringify(o);
    } catch {
      return String(o);
    }
  }
  return String(err);
}

export default function SubmitResultForm() {
  const [url, setUrl] = useState("");
  const [resp, setResp] = useState<IngestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errText, setErrText] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrText(null);
    setResp(null);
    try {
      const r = await fetch("/api/proofs/ingest?dry=0", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data: IngestResponse = await r.json();
      if (!r.ok || !data.ok) {
        setErrText(extractErrorText(data.error || `HTTP ${r.status}`));
      } else {
        setResp(data);
      }
    } catch (e: any) {
      setErrText(extractErrorText(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Paste a result link (e.g. athletic.net/result/..., milesplit.com/performance/...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          type="url"
        />
        <p className="text-xs text-gray-500">
          Use direct result links — not athlete or meet overview pages.
        </p>
        <button
  type="submit"
  disabled={loading || !url}
  className="inline-flex items-center justify-center gap-2 rounded bg-black text-white px-4 py-2 disabled:opacity-50"
>
  {loading && (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" />
    </svg>
  )}
  {loading ? "Parsing…" : "Ingest"}
</button>

      </form>

      {errText && (
        <div className="text-sm text-red-700 border border-red-200 bg-red-50 p-3 rounded whitespace-pre-line">
          {errText}
        </div>
      )}

      {resp?.ok && <ResultCard data={resp} />}
    </div>
  );
}
