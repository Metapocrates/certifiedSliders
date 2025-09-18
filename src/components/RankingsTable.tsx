import StarInline from '@/components/StarInline';

/** Row shape consumed by the table */
export type RankingsRow = {
  athlete_id: string;
  username: string;               // ⬅️ required for profile links
  full_name: string;
  class_year: number | null;
  gender: 'M' | 'F' | string;
  school_name: string;
  school_state: string;
  event: string;
  mark: string | null;
  mark_seconds: number | null;
  mark_seconds_adj: number | null;
  wind: number | null;
  season: string | null;
  meet_name: string | null;
  meet_date: string | null;       // ISO date string
  proof_url: string | null;
  /** ⭐ added: show stars inline on rankings */
  star_rating: number | null;
};

type Props = {
  rows: RankingsRow[];
};

function fmtMark(row: RankingsRow) {
  // Prefer normalized text if present; otherwise format seconds
  if (row.mark) return row.mark;
  if (row.mark_seconds_adj ?? row.mark_seconds) {
    const s = (row.mark_seconds_adj ?? row.mark_seconds) as number;
    // mm:ss.ss for >= 60, otherwise ss.ss
    if (s >= 60) {
      const mm = Math.floor(s / 60);
      const ss = (s % 60).toFixed(2).padStart(5, '0');
      return `${mm}:${ss}`;
    }
    return s.toFixed(2);
  }
  return '—';
}

function fmtWind(w: number | null) {
  if (w === null || w === undefined) return '—';
  const sign = w > 0 ? '+' : '';
  return `${sign}${w.toFixed(1)}`;
}

function fmtMeet(row: RankingsRow) {
  const when = row.meet_date ? new Date(row.meet_date).toLocaleDateString() : '';
  if (row.meet_name && when) return `${row.meet_name} • ${when}`;
  if (row.meet_name) return row.meet_name;
  if (when) return when;
  return '—';
}

export default function RankingsTable({ rows }: Props) {
  if (!rows?.length) {
    return <div className="text-sm subtle">No rankings found for this filter.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Athlete</th>
            <th>Class</th>
            <th>School</th>
            <th>Event</th>
            <th>Mark</th>
            <th>Wind</th>
            <th>Meet / Date</th>
            <th>Proof</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={`${r.athlete_id}-${r.event}-${idx}`}>
              <td>{idx + 1}</td>
              <td>
                <a href={`/athletes/${r.username}`} className="link">
                  {r.full_name}
                </a>
                <StarInline value={r.star_rating} className="ml-2 align-middle" />
              </td>
              <td>{r.class_year ?? '—'}</td>
              <td>
                {r.school_name}
                {r.school_state ? `, ${r.school_state}` : ''}
              </td>
              <td>{r.event}</td>
              <td>{fmtMark(r)}</td>
              <td>{fmtWind(r.wind)}</td>
              <td>{fmtMeet(r)}</td>
              <td>
                {r.proof_url ? (
                  <a
                    href={r.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link"
                  >
                    open
                  </a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
