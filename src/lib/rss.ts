// src/lib/rss.ts
import 'server-only';
import Parser from 'rss-parser';

type RawItem = {
    title?: string;
    link?: string;
    pubDate?: string;
    enclosure?: { url?: string; type?: string };
    mediaContent?: { $?: { url?: string; type?: string } } | { url?: string; type?: string };
    contentEncoded?: string;
    content?: string;
};

export type NewsItem = {
    title: string;
    link: string;
    pubDate: string | undefined;  // required key, may be undefined
    image: string | undefined;    // required key, may be undefined
    source: string;
};

const parser = new Parser<{}, RawItem>({
    timeout: 10000,
    headers: { 'User-Agent': 'CertifiedSliders/1.0 (RSS fetcher)' },
    customFields: {
        item: [
            ['media:content', 'mediaContent'],
            ['content:encoded', 'contentEncoded'],
            'enclosure',
            'content',
        ],
    },
});

// ---------- helpers ----------
function toAbsolute(url: string | undefined, base?: string): string | undefined {
    if (!url) return undefined;
    try {
        return new URL(url, base).toString();
    } catch {
        return undefined;
    }
}

function extractImageFromHtml(html?: string, base?: string): string | undefined {
    if (!html) return undefined;
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m?.[1]) return toAbsolute(m[1], base);
    return undefined;
}

function extractFast(i: RawItem, base?: string): string | undefined {
    // enclosure
    if (i.enclosure?.url && (i.enclosure.type?.startsWith('image') || !i.enclosure.type)) {
        return toAbsolute(i.enclosure.url, base);
    }
    // media:content
    const mc: any = i.mediaContent;
    const mcUrl = mc?.$?.url ?? mc?.url;
    if (mcUrl) return toAbsolute(mcUrl, base);
    // first <img> in HTML
    return extractImageFromHtml(i.contentEncoded || i.content, base);
}

async function fetchOgImage(articleUrl: string): Promise<string | undefined> {
    try {
        const res = await fetch(articleUrl, {
            headers: { 'User-Agent': 'CertifiedSliders/1.0 (OG fetcher)' },
            cache: 'no-store',
            next: { revalidate: 0 },
        });
        if (!res.ok) return undefined;
        const html = await res.text();

        // og:image
        const og =
            html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
        if (og?.[1]) return toAbsolute(og[1], articleUrl);

        // twitter:image
        const tw =
            html.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
        if (tw?.[1]) return toAbsolute(tw[1], articleUrl);

        // fallback: first <img>
        return extractImageFromHtml(html, articleUrl);
    } catch {
        return undefined;
    }
}

async function enrichImages(items: NewsItem[], maxOgLookups = 8): Promise<NewsItem[]> {
    const need = items.map((it, idx) => ({ it, idx })).filter(x => !x.it.image).slice(0, maxOgLookups);
    if (!need.length) return items;
    await Promise.all(
        need.map(async ({ it }) => {
            if (it.link && it.link !== '#') {
                const og = await fetchOgImage(it.link);
                if (og) it.image = og;
            }
        })
    );
    return items;
}

// ---------- individual feeds ----------
export async function getTrackAndFieldNews(limit = 8): Promise<NewsItem[]> {
    try {
        const feed = await parser.parseURL('https://trackandfieldnews.com/feed');
        const base = feed.link || 'https://trackandfieldnews.com/';
        let items: NewsItem[] = (feed.items ?? []).slice(0, limit).map((i) => ({
            title: i.title ?? 'Untitled',
            link: i.link ?? '#',
            pubDate: i.pubDate ?? undefined,
            image: extractFast(i, base),
            source: 'Track & Field News',
        }));
        items = await enrichImages(items, 8);
        return items;
    } catch {
        return [];
    }
}

export async function getUSATFNews(limit = 8): Promise<NewsItem[]> {
    try {
        const feed = await parser.parseURL('https://usatf.org/news?format=rss');
        const base = feed.link || 'https://usatf.org/';
        let items: NewsItem[] = (feed.items ?? []).slice(0, limit).map((i) => ({
            title: i.title ?? 'Untitled',
            link: i.link ?? '#',
            pubDate: i.pubDate ?? undefined,
            image: extractFast(i, base),
            source: 'USATF',
        }));
        items = await enrichImages(items, 8);
        return items;
    } catch {
        return [];
    }
}

// ---------- merged feed ----------
export async function getMergedNews(total = 10): Promise<NewsItem[]> {
    const [a, b] = await Promise.all([getTrackAndFieldNews(total), getUSATFNews(total)]);
    const merged = [...a, ...b]
        .filter((x) => x.link)
        .reduce<NewsItem[]>((acc, item) => {
            if (!acc.find((t) => t.link === item.link)) acc.push(item);
            return acc;
        }, [])
        .sort((x, y) => {
            const dx = x.pubDate ? +new Date(x.pubDate) : 0;
            const dy = y.pubDate ? +new Date(y.pubDate) : 0;
            return dy - dx;
        })
        .slice(0, total);
    return merged;
}
