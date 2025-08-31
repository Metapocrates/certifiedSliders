'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function RankingsPager({ page, pageCount }: { page: number; pageCount: number }) {
  const router = useRouter();
  const sp = useSearchParams();

  function go(to: number) {
    const next = new URLSearchParams(sp);
    next.set('page', String(to));
    router.push(`/rankings?${next.toString()}`);
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= pageCount;

  return (
    <div className="flex items-center gap-2">
      <button
        className="btn"
        disabled={prevDisabled}
        onClick={() => go(page - 1)}
        aria-disabled={prevDisabled}
      >
        ← Prev
      </button>
      <div className="text-sm text-muted-foreground">
        Page {page} of {Math.max(1, pageCount)}
      </div>
      <button
        className="btn"
        disabled={nextDisabled}
        onClick={() => go(page + 1)}
        aria-disabled={nextDisabled}
      >
        Next →
      </button>
    </div>
  );
}
