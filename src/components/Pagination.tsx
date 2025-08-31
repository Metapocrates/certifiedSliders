"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const router = useRouter();
  const sp = useSearchParams();

  const go = (p: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(Math.min(Math.max(1, p), pageCount)));
    router.push(`/rankings?${params.toString()}`);
  };

  const pages = Array.from({ length: Math.min(7, pageCount) }, (_, i) => {
    // window around current page
    const start = Math.max(1, Math.min(page - 3, pageCount - 6));
    return start + i;
  });

  return (
    <div className="flex items-center gap-2 p-4">
      <button className="btn" disabled={page <= 1} onClick={() => go(page - 1)}>Prev</button>
      <div className="flex items-center gap-1">
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => go(p)}
            className={`btn ${p === page ? "bg-muted" : ""}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ))}
      </div>
      <button className="btn" disabled={page >= pageCount} onClick={() => go(page + 1)}>Next</button>
    </div>
  );
}
