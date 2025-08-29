"use client";
import { useSearchParams, useRouter } from "next/navigation";

export default function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const router = useRouter();
  const sp = useSearchParams();

  const go = (p: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(Math.min(Math.max(1, p), pageCount)));
    router.push(`/rankings?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <button className="btn" onClick={() => go(page - 1)} disabled={page <= 1}>Prev</button>
      <div className="opacity-70">Page {page} of {pageCount}</div>
      <button className="btn" onClick={() => go(page + 1)} disabled={page >= pageCount}>Next</button>
    </div>
  );
}
