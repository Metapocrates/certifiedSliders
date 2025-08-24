// src/components/news-grid.tsx
import 'server-only';
import { getTrackAndFieldNews } from '@/lib/rss';

export const revalidate = 600;

function formatDate(d?: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default async function NewsGrid() {
  const items = await getTrackAndFieldNews(6);

  if (!items.length) {
    return <div className="text-sm subtle">Couldn’t load the news feed right now.</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item, idx) => (
        <a
          key={`${idx}-${item.link}`}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="card overflow-hidden hover:opacity-95 transition"
          title={item.title}
        >
          {item.image ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              <img
                src={item.image}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="relative aspect-[16/9] w-full bg-[var(--border)]" />
          )}

          <div className="p-4">
            <div className="text-xs subtle mb-1">
              {item.source}
              {formatDate(item.pubDate) ? ` • ${formatDate(item.pubDate)}` : ''}
            </div>
            <div className="font-medium leading-snug line-clamp-2">{item.title}</div>
          </div>
        </a>
      ))}
    </div>
  );
}
