'use client';

import { useState } from 'react';
import ProofIngestForm from './ProofIngestForm';
import ManualResultForm from './ManualResultForm';

export default function TabsClient() {
  const [tab, setTab] = useState<'link' | 'manual'>('link');

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('link')}
          className={`rounded-md border px-3 py-1 text-sm ${tab === 'link' ? 'bg-black text-app' : ''}`}
        >
          Paste link (Athletic.net / MileSplit)
        </button>
        <button
          onClick={() => setTab('manual')}
          className={`rounded-md border px-3 py-1 text-sm ${tab === 'manual' ? 'bg-black text-app' : ''}`}
        >
          Manual entry (with proof)
        </button>
      </div>

      {tab === 'link' ? <ProofIngestForm /> : <ManualResultForm />}
    </div>
  );
}
