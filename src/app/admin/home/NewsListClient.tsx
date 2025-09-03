"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteNewsItem } from "./actions";

type News = { id: string; title: string; url: string | null; source: string | null; published_at: string };

export default function NewsListClient({ items }: { items: News[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="p-4 rounded-xl border">
      <h3 className="font-semibold mb-3">Latest News</h3>
      {!items.length ? (
        <p className="text-sm text-gray-600">No news yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="truncate">
                  {n.url ? (
                    <a href={n.url} target="_blank" className="underline">{n.title}</a>
                  ) : (
                    <span className="font-medium">{n.title}</span>
                  )}
                </div>
                <div className="text-gray-500">
                  {new Date(n.published_at).toLocaleString()} {n.source ? `— ${n.source}` : ""}
                </div>
              </div>
              <button
                className="btn"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const fd = new FormData();
                    fd.set("id", n.id);
                    await deleteNewsItem(fd);
                    router.refresh();
                  })
                }
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
