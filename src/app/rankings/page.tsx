// src/app/rankings/page.tsx
import { fetchRankings } from '@/lib/rankings';
import RankingsFilters from '@/components/RankingsFilters';
import RankingsPager from '@/components/RankingsPager';
import type { ReactNode } from 'react';

type Search = {
  event?: string;
  gender?: string;
  classYear?: string; // URL param -> string
  state?: string;
  sort?: 'name' | 'date' | 'time' | 'time_adj';
  page?: string;
  pageSize?: string;
};

interface RankingRow {
  athlete_id: string;
  full_name: string | null;
  school_name: string | null;
  school_state: string | null;
  class_year: number | null;
  gender: string | null;
  event: string;
  mark: string | null;
  mark_seconds: number | null;
  mark_seconds_adj: number | null;
  meet_name: string | null;
  meet_date: string | null;
  proof_url: string | null;
}

export const revalidate = 60;

export default async function RankingsPage({ searchParams = {} as Search }) {
  // Coerce URL strings -> numbers where needed
  const classYearNum =
    searchParams.classYear && Number.isFinite(Number(searchParams.classYear))
      ? Number(searchParams.classYear)
      : undefined;

  const pageNum =
    searchParams.page && Number.isFinite(Number(searchParams.page))
      ? Number(searchParams.page)
      : undefined;

  const pageSizeNum =
    searchParams.pageSize && Number.isFinite(Number(searchParams.pageSize))
      ? Number(searchParams.pageSize)
      : undefined;

  const query = {
    event: searchParams.event || undefined,
    gender: searchParams.gender || undefined,
    state: searchParams.state || undefined,
    sort: searchParams.sort || undefined,
    classYear: classYearNum, // number | undefined
    page: pageNum,
    pageSize: pageSizeNum,
  };

  const { rows, total, page, perPage, pageCount } = await fetchRankings(query as any);
  const data = rows as RankingRow[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Rankings</h1>

      {/* Filters bar (URL-driven) */}
      <RankingsFilters initial={searchParams} />

      <div className="text-sm text-muted-foreground">
        {total.toLocaleString()} results • page {page} / {Math.max(1, pageCount)} • show {perPage}
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <Th>Name</Th>
              <Th>School</Th>
              <Th>State</Th>
              <Th>Class</Th>
              <Th>Gender</Th>
              <Th>Event</Th>
              <Th>Best</Th>
              <Th>Adj</Th>
              <Th>Meet</Th>
              <Th>Date</Th>
              <Th>Proof</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((r: RankingRow, i: number) => (
              <tr key={`${r.athlete_id}-${r.event}-${i}`} className="border-t">
                <Td>{r.full_name ?? '—'}</Td>
                <Td>{r.school_name ?? '—'}</Td>
                <Td>{r.school_state ?? '—'}</Td>
                <Td>{r.class_year ?? '—'}</Td>
                <Td>{r.gender ?? '—'}</Td>
                <Td>{r.event}</Td>
                <Td>{r.mark ?? (r.mark_seconds?.toFixed(2) ?? '—')}</Td>
                <Td>{r.mark_seconds_adj?.toFixed(2) ?? '—'}</Td>
                <Td>{r.meet_name ?? '—'}</Td>
                <Td>{r.meet_date ? new Date(r.meet_date).toLocaleDateString() : '—'}</Td>
                <Td>
                  {r.proof_url ? (
                    <a className="underline" href={r.proof_url} target="_blank" rel="noreferrer">
                      link
                    </a>
                  ) : (
                    '—'
                  )}
                </Td>
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td colSpan={11} className="p-4 text-center text-muted-foreground">
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      <div className="flex justify-end">
        <RankingsPager page={page} pageCount={pageCount} />
      </div>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="p-2 font-medium">{children}</th>;
}
function Td({ children }: { children: ReactNode }) {
  return <td className="p-2">{children}</td>;
}
