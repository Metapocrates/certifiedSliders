// src/components/news-merged-grid.tsx
import 'server-only';
import { getMergedNews } from '@/lib/rss';

export const revalidate = 600;

function formatDate(d?: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default async function NewsMergedGrid() {
  const items = await getMergedNews(10);

  if (!items.length) {
    return <div className="text-sm subtle">Couldn’t load the news feed right now.</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, idx) => {
        const hasImage = Boolean(item.image);
        return (
          <a
            key={`${idx}-${item.link}`}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="card overflow-hidden hover:opacity-95 transition"
            title={item.title}
          >
            {/* Media area */}
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              {hasImage ? (
                <img
                  src={item.image!}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                // Styled fallback (no image available)
                <div className="flex h-full w-full items-center justify-center bg-[var(--surface)]">
                  {/* subtle pattern */}
                  <div className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)',
                      backgroundSize: '12px 12px',
                    }}
                  />
                  {/* source badge */}
                  <span className="relative inline-flex items-center rounded-md border border-[var(--border)] bg-[color-mix(in_oklab,var(--background),white_3%)] px-2 py-1 text-xs font-medium text-[var(--foreground)]">
                    {item.source}
                  </span>
                </div>
              )}
              {/* optional gradient for better text contrast on busy images */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[color-mix(in_oklab,var(--background),transparent_0%)] to-transparent" />
            </div>

            {/* Text area */}
            <div className="p-4">
              <div className="mb-1 text-xs subtle">
                {item.source}
                {formatDate(item.pubDate) ? ` • ${formatDate(item.pubDate)}` : ''}
              </div>
              <div className="font-medium leading-snug line-clamp-2">{item.title}</div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
