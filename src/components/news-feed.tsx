import 'server-only';
import { getTrackAndFieldNews } from '@/lib/rss';

export const revalidate = 600; // cache for 10 minutes (ISR)

export default async function NewsFeed() {
  const items = await getTrackAndFieldNews(5);

  if (!items.length) {
    return (
      <div className="text-sm subtle">
        Couldn’t load the news feed right now. Try again soon.
      </div>
    );
  }

  return (
    <ul className="space-y-2 text-sm">
      {items.map((item, idx) => (
        <li key={`${idx}-${item.link}`} className="flex items-center justify-between gap-3">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline line-clamp-2"
            title={item.title}
          >
            {item.title}
          </a>
          {item.pubDate ? (
            <time className="shrink-0 subtle">
              {new Date(item.pubDate).toLocaleDateString()}
            </time>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
