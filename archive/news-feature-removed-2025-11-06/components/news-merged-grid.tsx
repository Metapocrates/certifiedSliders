// src/components/news-merged-grid.tsx
import "server-only";
import { getMergedNews } from "@/lib/rss";
import Image from "next/image";

export const revalidate = 600;

function formatDate(d?: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default async function NewsMergedGrid() {
  // Cap at 8 (server + render safety)
  const items = ((await getMergedNews(8)) ?? []).slice(0, 8);

  if (!items.length) {
    return (
      <div className="text-sm subtle">Couldn't load the news feed right now.</div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {items.map((item: any, idx: number) => {
        const src = typeof item.image === "string" && item.image.trim() ? item.image : null;

        return (
          <a
            key={`${idx}-${item.link}`}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            title={item.title}
            className="
              block overflow-hidden rounded-lg border
              bg-card dark:bg-neutral-900
              hover:shadow-sm transition
            "
          >
            {/* Media area: fixed height for denser cards */}
            <div className="relative w-full h-28 sm:h-32 overflow-hidden">
              {src ? (
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                  // Avoid domain config for now; flip off later when you whitelist hosts
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-200 dark:bg-neutral-800">
                  {/* source badge as fallback */}
                  <span className="relative inline-flex items-center rounded-md border border-neutral-300/60 dark:border-neutral-700/60 bg-card/70 dark:bg-black/30 px-2 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-200">
                    {item.source}
                  </span>
                </div>
              )}
            </div>

            {/* Compact text area */}
            <div className="p-2">
              <div className="mb-1 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between gap-2">
                <span className="truncate">{item.source}</span>
                {formatDate(item.pubDate) ? (
                  <time className="shrink-0">{formatDate(item.pubDate)}</time>
                ) : null}
              </div>
              <div className="text-[13px] leading-snug font-medium line-clamp-2">
                {item.title}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
