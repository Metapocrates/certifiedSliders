import { createSupabaseServer } from '@/lib/supabase/compat';

export const revalidate = 300;

type CutoffRow = {
  id: number;
  event: string;
  gender: 'M' | 'F';
  class_year: number;
  star3_seconds: string | number;
  star4_seconds: string | number;
  star5_seconds: string | number;
  source: string | null;
  updated_at: string;
};

function fmt(n: string | number) {
  const v = typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(v)) return '—';
  return v.toFixed(3);
}

export default async function RatingsCutoffsPage() {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('rating_cutoffs')
    .select('*')
    .order('event', { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Star Ratings — Public Rough Cutoffs</h1>
      <p className="subtle">
        These are advisory guidelines by event, class year, and gender. Final stars are admin-assigned.
      </p>

      {error && (
        <div className="text-sm text-red-600">
          Failed to load cutoffs: {error.message}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Gender</th>
              <th>Class</th>
              <th>3★</th>
              <th>4★</th>
              <th>5★</th>
              <th>Source</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {(data as CutoffRow[] | null)?.map((r) => (
              <tr key={r.id}>
                <td>{r.event}</td>
                <td>{r.gender}</td>
                <td>{r.class_year}</td>
                <td>{fmt(r.star3_seconds)}</td>
                <td>{fmt(r.star4_seconds)}</td>
                <td>{fmt(r.star5_seconds)}</td>
                <td>{r.source || '—'}</td>
                <td>{new Date(r.updated_at).toLocaleDateString()}</td>
              </tr>
            )) || null}
          </tbody>
        </table>
      </div>

      <p className="text-xs subtle">
        Notes: Cutoffs reflect fully automatic timing when applicable and may shift with cohort depth, wind, and altitude.
      </p>
    </div>
  );
}
