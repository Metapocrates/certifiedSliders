import "server-only";
import { getMergedNews, type MergedNewsItem } from "@/lib/rss";

export const revalidate = 600;

function formatDate(d?: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default async function NewsGrid() {
  const items = await getMergedNews(8);
  if (!items.length) {
    return <div className="text-sm text-neutral-500">Couldn't load the news feed right now.</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {items.map((item: MergedNewsItem, idx: number) => {
        const hasImage = Boolean(item.image);
        return (
          <a
            key={`${idx}-${item.link}`}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            title={item.title}
            className="block overflow-hidden rounded-lg border bg-card hover:shadow-sm transition"
          >
            <div className="relative w-full h-28 sm:h-32 overflow-hidden">
              {hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image!}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-200">
                  <span className="relative inline-flex items-center rounded-md border border-neutral-300 bg-card/70 px-2 py-1 text-xs font-medium text-neutral-700">
                    {item.source}
                  </span>
                </div>
              )}
            </div>
            <div className="p-2">
              <div className="mb-1 text-[11px] text-neutral-500 flex items-center justify-between gap-2">
                <span className="truncate">{item.source}</span>
                {formatDate(item.pubDate) ? <time className="shrink-0">{formatDate(item.pubDate)}</time> : null}
              </div>
              <div className="text-[13px] leading-snug font-medium line-clamp-2">{item.title}</div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
