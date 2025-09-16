// Server component: pulls headlines from an external RSS feed and shows the latest few.
import Parser from "rss-parser";

const DEFAULT_FEED =
  process.env.NEXT_PUBLIC_RSS_FEED_URL ||
  "https://trackandfieldnews.com/feed/"; // change if you use a different source

type Item = { title?: string; link?: string; isoDate?: string; creator?: string };

export default async function ExternalNewsFeed() {
  // Fetch with ISR so we don’t hammer the source (revalidate every 5 min)
  const res = await fetch(DEFAULT_FEED, { next: { revalidate: 300 } });
  if (!res.ok) {
    return (
      <div className="p-4 rounded-xl border">
        <h3 className="font-semibold mb-2">From around the web</h3>
        <p className="text-sm text-gray-600">Couldn’t load the feed right now.</p>
      </div>
    );
  }

  const xml = await res.text();
  const parser = new Parser();
  let items: Item[] = [];
  try {
    const feed = await parser.parseString(xml);
    items = (feed.items || []).slice(0, 6) as Item[];
  } catch {
    // swallow parse errors and show a gentle fallback
  }

  if (!items.length) {
    return (
      <div className="p-4 rounded-xl border">
        <h3 className="font-semibold mb-2">From around the web</h3>
        <p className="text-sm text-gray-600">No items found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border">
      <h3 className="font-semibold mb-3">From around the web</h3>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm">
            {it.link ? (
              <a href={it.link} target="_blank" className="underline">
                {it.title || it.link}
              </a>
            ) : (
              <span className="font-medium">{it.title}</span>
            )}
            {it.isoDate ? (
              <span className="text-muted"> — {new Date(it.isoDate).toLocaleDateString()}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
