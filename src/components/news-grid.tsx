// src/components/news-grid.tsx
import 'server-only';
import { getTrackAndFieldNews } from '@/lib/rss';

export const revalidate = 0;                 // for testing; switch back to 600 later
export const dynamic = 'force-dynamic';      // for testing; remove later

function formatDate(d?: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default async function NewsGrid() {
  // Get items; if your rss fn ignores the param, we still slice below.
  const items = (await getTrackAndFieldNews(8)) ?? [];
  const top = items.slice(0, 8); // ✅ hard cap at 8

  if (!top.length) {
    return <div className="text-sm subtle">Couldn’t load the news feed right now.</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {top.map((item, idx) => (
        <a
          key={`${idx}-${item.link}`}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          title={item.title}
          className="block overflow-hidden rounded-lg border bg-white dark:bg-neutral-900 hover:shadow-sm transition"
        >
          {item.image ? (
            <div className="relative w-full h-28 sm:h-32">
              <img
                src={item.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-full h-28 sm:h-32 bg-neutral-200 dark:bg-neutral-800" />
          )}
          <div className="p-2">
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1 flex items-center justify-between gap-2">
              <span className="truncate">{item.source}</span>
              {formatDate(item.pubDate) ? (
                <time className="shrink-0">{formatDate(item.pubDate)}</time>
              ) : null}
            </div>
            <div className="text-[13px] leading-snug font-medium line-clamp-2">{item.title}</div>
          </div>
        </a>
      ))}
    </div>
  );
}
