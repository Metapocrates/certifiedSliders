import "server-only";
import { getMergedNews } from "@/lib/rss";

export const revalidate = 600;

function formatDate(d?: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default async function NewsMergedGrid() {
  // Show 4 larger cards
  const items = await getMergedNews(4);

  if (!items.length) {
    return <div className="text-sm text-neutral-500">Couldn't load the news feed right now.</div>;
  }

  return (
    <div className="p-4 rounded-xl border">
      <h3 className="font-semibold mb-3">From around the web</h3>
      {/* Bigger cards: 1 col on mobile, 2 on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item, idx) => {
          const hasImage = Boolean(item.image);
          return (
            <a
              key={`${idx}-${item.link}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              title={item.title}
              className="block overflow-hidden rounded-2xl border bg-card hover:shadow-md transition"
            >
              {/* Taller media area for stronger images */}
              <div className="relative w-full h-44 md:h-56 overflow-hidden bg-neutral-100">
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
                  <div className="absolute inset-0 flex items-center justify-between">
                    <span className="relative inline-flex items-center rounded-md border border-neutral-300 bg-card/80 px-2 py-1 text-xs font-medium text-neutral-700">
                      {item.source}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3">
                <div className="mb-1 text-[12px] text-neutral-500 flex items-center justify-between gap-2">
                  <span className="truncate">{item.source}</span>
                  {formatDate(item.pubDate) ? <time className="shrink-0">{formatDate(item.pubDate)}</time> : null}
                </div>
                <div className="text-[15px] leading-snug font-medium line-clamp-3">{item.title}</div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
