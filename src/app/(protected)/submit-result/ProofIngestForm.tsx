'use client';

import { useState } from 'react';

type IngestResp = {
  ok: boolean;
  autoVerified: boolean;
  confidence: number;
  proofId: number;
  resultId: number | null;
};

export default function ProofIngestForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<IngestResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setResp(null);
    try {
      const r = await fetch('/api/proofs/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const j = await r.json();

      if (r.status === 401) {
        throw new Error('Please sign in to submit results.');
      }

      if (!r.ok) throw new Error(j.error || 'Failed to ingest');
      setResp(j as IngestResp);
    } catch (e: any) {
      setErr(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-lg border p-4">
        <h3 className="mb-1 text-base font-semibold">Paste a result link</h3>
        <p className="mb-3 text-sm text-gray-600">
          Supported: <span className="font-medium">Athletic.net</span> and <span className="font-medium">MileSplit</span>.
          We auto-validate & auto-parse—<span className="font-medium">no manual fields</span>.
        </p>
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input
            type="url"
            inputMode="url"
            required
            placeholder="https://www.athletic.net/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!url || loading}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-app disabled:opacity-50"
          >
            {loading ? 'Validating…' : 'Submit'}
          </button>
        </form>
        <p className="mt-2 text-xs text-muted">
          We only fetch the page you share. No background crawling.
        </p>
      </div>

      {err && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 space-y-1">
          <p>{err}</p>
          {err.toLowerCase().includes('sign in') && (
            <a href="/signin" className="text-sm underline">Go to sign in</a>
          )}
        </div>
      )}

      {resp && (
        <div className="rounded-md border p-3 text-sm">
          <div>
            Status: <b>{resp.autoVerified ? 'Auto-verified' : 'Pending review'}</b>
          </div>
          <div>Confidence: {(resp.confidence * 100).toFixed(1)}%</div>
          <div>Proof ID: {resp.proofId}</div>
          {resp.resultId !== null && <div>Result ID: {resp.resultId}</div>}
        </div>
      )}
    </div>
  );
}
