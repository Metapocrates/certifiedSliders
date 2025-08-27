'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Row {
  id: string;
  athlete_id: string;
  event: string;
  mark: string;
  meet_name: string | null;
  meet_date: string | null;
  status: string | null;
  proof_url: string | null;
}

export default function AdminVerifyPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('results')
        .select('id, athlete_id, event, mark, meet_name, meet_date, status, proof_url')
        .eq('status', 'pending')
        .order('meet_date', { ascending: false });
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const verify = async (id: string) => {
    const supabase = createClient();
    await supabase.rpc('verify_result', { p_result_id: id });
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const reject = async (id: string) => {
    const supabase = createClient();
    await supabase.from('results').update({ status: 'rejected' }).eq('id', id);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground p-4">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Verify Results</h1>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Event</th>
              <th className="text-left p-2">Mark</th>
              <th className="text-left p-2">Meet</th>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Proof</th>
              <th className="text-right p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-3" colSpan={6}>
                  No pending results.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.event}</td>
                  <td className="p-2">{r.mark}</td>
                  <td className="p-2">{r.meet_name ?? '—'}</td>
                  <td className="p-2">
                    {r.meet_date ? new Date(r.meet_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-2">
                    {r.proof_url ? (
                      <a className="underline" href={r.proof_url} target="_blank">
                        link
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-2 text-right space-x-2">
                    <button
                      onClick={() => verify(r.id)}
                      className="rounded-md border px-2 py-1"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => reject(r.id)}
                      className="rounded-md border px-2 py-1"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
