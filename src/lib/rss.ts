import 'server-only';
import Parser from 'rss-parser';

type Item = { title: string; link: string; pubDate?: string };

const parser = new Parser({
    timeout: 10000, // 10s
    headers: { 'User-Agent': 'CertifiedSliders/1.0 (RSS fetcher)' },
});

// Pull the top N articles from Track & Field News
export async function getTrackAndFieldNews(limit = 5): Promise<Item[]> {
    try {
        const feed = await parser.parseURL('https://trackandfieldnews.com/feed');
        return (feed.items ?? [])
            .slice(0, limit)
            .map(i => ({ title: i.title ?? 'Untitled', link: i.link ?? '#', pubDate: i.pubDate }));
    } catch {
        // Fallback to empty list on any error
        return [];
    }
}
