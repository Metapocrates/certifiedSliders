import "server-only";
import Link from "next/link";
import { getMergedNews, type MergedNewsItem } from "@/lib/rss";

export const revalidate = 600; // cache for 10 min

export default async function NewsFeedList() {
  const items = await getMergedNews(6);
  if (!items.length) {
    return (
      <div className="p-4 rounded-xl border">
        <h3 className="font-semibold mb-2">From around the web</h3>
        <p className="text-sm text-neutral-600">No items right now.</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border">
      <h3 className="font-semibold mb-3">From around the web</h3>
      <ul className="space-y-2">
        {items.map((item: MergedNewsItem, idx: number) => (
          <li key={`${idx}-${item.link}`} className="text-sm">
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="underline">
              {item.title}
            </a>
            {item.source ? <span className="text-neutral-500"> — {item.source}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
