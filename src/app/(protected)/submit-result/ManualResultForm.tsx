'use client';

import { useState } from 'react';

type Resp = { ok: boolean; proofId: number; resultId: number };

export default function ManualResultForm() {
  const [form, setForm] = useState({
    event: '',
    markText: '',
    timing: '' as '' | 'FAT' | 'hand',
    wind: '' as '' | number,
    season: 'OUTDOOR',
    meetName: '',
    meetDate: '',
    proofUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<Resp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null); setResp(null);
    try {
      const r = await fetch('/api/results/manual', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          ...form,
          wind: form.wind === '' ? null : Number(form.wind),
          timing: form.timing || null,
          meetName: form.meetName || null,
          meetDate: form.meetDate || null,
        }),
      });
      const j = await r.json();
      if (r.status === 401) throw new Error('Please sign in to submit results.');
      if (!r.ok) throw new Error(j.error || 'Failed to save');
      setResp(j as Resp);
    } catch (e: any) {
      setErr(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
        <h3 className="text-base font-semibold">Manual entry (requires proof link)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1">Event</div>
            <input className="w-full rounded-md border px-3 py-2 text-sm"
                   value={form.event} onChange={(e)=>update('event', e.target.value)} required />
          </label>
          <label className="text-sm">
            <div className="mb-1">Mark</div>
            <input className="w-full rounded-md border px-3 py-2 text-sm"
                   placeholder="14.76, 53.7h, 4:12.35"
                   value={form.markText} onChange={(e)=>update('markText', e.target.value)} required />
          </label>
          <label className="text-sm">
            <div className="mb-1">Timing</div>
            <select className="w-full rounded-md border px-3 py-2 text-sm"
                    value={form.timing} onChange={(e)=>update('timing', e.target.value as any)}>
              <option value="">Auto</option>
              <option value="FAT">FAT</option>
              <option value="hand">Hand</option>
            </select>
          </label>
          <label className="text-sm">
            <div className="mb-1">Wind (m/s)</div>
            <input className="w-full rounded-md border px-3 py-2 text-sm"
                   type="number" step="0.1"
                   value={form.wind as any} onChange={(e)=>update('wind', e.target.value === '' ? '' : Number(e.target.value))} />
          </label>
          <label className="text-sm">
            <div className="mb-1">Season</div>
            <select className="w-full rounded-md border px-3 py-2 text-sm"
                    value={form.season} onChange={(e)=>update('season', e.target.value as any)}>
              <option value="OUTDOOR">Outdoor</option>
              <option value="INDOOR">Indoor</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <div className="mb-1">Meet name</div>
            <input className="w-full rounded-md border px-3 py-2 text-sm"
                   value={form.meetName} onChange={(e)=>update('meetName', e.target.value)} />
          </label>
          <label className="text-sm">
            <div className="mb-1">Meet date</div>
            <input className="w-full rounded-md border px-3 py-2 text-sm"
                   type="date" value={form.meetDate}
                   onChange={(e)=>update('meetDate', e.target.value)} />
          </label>
          <label className="text-sm sm:col-span-2">
            <div className="mb-1">Proof URL (required)</div>
            <input className="w-full rounded-md border px-3 py-2 text-sm"
                   type="url" required
                   placeholder="https://..."
                   value={form.proofUrl} onChange={(e)=>update('proofUrl', e.target.value)} />
          </label>
        </div>

        <button type="submit"
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-app disabled:opacity-50"
                disabled={loading}>
          {loading ? 'Saving…' : 'Submit for verification'}
        </button>
      </form>

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
          <div>Submitted for verification.</div>
          <div>Proof ID: {resp.proofId}</div>
          <div>Result ID: {resp.resultId}</div>
        </div>
      )}
    </div>
  );
}
