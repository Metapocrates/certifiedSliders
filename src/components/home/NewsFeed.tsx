// src/components/home/NewsFeed.tsx
// Server component
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

// Minimal shape for news items
type NewsItem = {
  id: string;
  title?: string | null;
  url?: string | null;
  source?: string | null;
  published_at?: string | null;
  [key: string]: unknown;
};

export default async function NewsFeed() {
  const supabase = createSupabaseServer();

  const { data: news, error } = await supabase
    .from("news_items")
    .select("id, title, url, source, published_at")
    .order("published_at", { ascending: false })
    .limit(6);

  if (error) {
    return (
      <div className="p-4 rounded-xl border">
        <h3 className="font-semibold mb-2">News</h3>
        <p className="text-sm text-red-600">Error: {error.message}</p>
      </div>
    );
  }

  if (!news?.length) {
    return (
      <div className="p-4 rounded-xl border">
        <h3 className="font-semibold mb-2">News</h3>
        <p className="text-sm text-gray-600">No news yet.</p>
      </div>
    );
  }

  const items: NewsItem[] = news as unknown as NewsItem[];

  return (
    <div className="p-4 rounded-xl border">
      <h3 className="font-semibold mb-3">News</h3>
      <ul className="space-y-2">
        {items.map((n: NewsItem) => (
          <li key={n.id} className="text-sm">
            {n.url ? (
              <a href={n.url} target="_blank" rel="noreferrer" className="underline">
                {n.title}
              </a>
            ) : (
              <span className="font-medium">{n.title}</span>
            )}
            {n.source ? <span className="text-gray-500"> — {n.source}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
