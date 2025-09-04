import "server-only";
import Parser from "rss-parser";

export type MergedNewsItem = {
    title: string;
    link: string;
    pubDate?: string;
    source?: string;
    image?: string | null;
};

const DEFAULT_FEEDS: string[] = (
    process.env.RSS_FEEDS || "https://trackandfieldnews.com/feed/"
)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const parser = new Parser({
    headers: { "User-Agent": "CertifiedSlidersBot/1.0 (+https://certifiedsliders.com)" },
});

function firstImageFromHtml(html?: string): string | null {
    if (!html) return null;
    // src
    const m1 = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
    if (m1?.[1]) return m1[1];
    // lazy
    const m2 = /<img[^>]+data-(?:src|lazy-src|original)=["']([^"']+)["']/i.exec(html);
    if (m2?.[1]) return m2[1];
    // srcset (take first)
    const m3 = /<img[^>]+srcset=["']([^"']+)["']/i.exec(html);
    if (m3?.[1]) return m3[1].split(",")[0]?.trim().split(" ")[0] || null;
    return null;
}

function absoluteHttps(raw: string | null | undefined, pageUrl: string): string | null {
    if (!raw) return null;
    try {
        if (raw.startsWith("data:")) return raw;               // allow data URIs
        if (raw.startsWith("//")) return `https:${raw}`;       // protocol-relative → https
        if (raw.startsWith("/")) {                             // root-relative
            const u = new URL(pageUrl);
            return `${u.protocol}//${u.host}${raw}`.replace(/^http:\/\//i, "https://");
        }
        // if no scheme (e.g. "images/foo.jpg"), resolve against page
        if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
            return new URL(raw, pageUrl).toString().replace(/^http:\/\//i, "https://");
        }
        // force http→https
        if (raw.startsWith("http://")) return raw.replace(/^http:\/\//i, "https://");
        return raw;
    } catch {
        return null;
    }
}

async function maybeFetchOgImage(url: string): Promise<string | null> {
    if (process.env.RSS_ENHANCE_IMAGES !== "1") return null;
    try {
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) return null;
        const html = await res.text();
        const og =
            /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ||
            /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ||
            firstImageFromHtml(html);
        return absoluteHttps(og || null, url);
    } catch {
        return null;
    }
}

/** Fetch all feeds, merge, dedupe, newest → oldest. */
export async function getMergedNews(limit = 8, feeds: string[] = DEFAULT_FEEDS): Promise<MergedNewsItem[]> {
    const xmls = await Promise.all(
        feeds.map(async (url) => {
            try {
                const res = await fetch(url, { next: { revalidate: 300 } });
                if (!res.ok) return null;
                return await res.text();
            } catch {
                return null;
            }
        })
    );

    const items: MergedNewsItem[] = [];

    for (let i = 0; i < feeds.length; i++) {
        const xml = xmls[i];
        if (!xml) continue;

        try {
            const feed = await parser.parseString(xml);
            const sourceTitle = (feed?.title || new URL(feeds[i]).hostname).replace(/^www\./, "");

            for (const it of feed.items || []) {
                const rawLink = (it.link || (it as any).guid || "").toString();
                const link = rawLink.trim();
                if (!link) continue;

                // media/enclosures
                const enclosure = (it as any)?.enclosure;
                const encUrl =
                    enclosure?.url && (!enclosure.type || /^image\//i.test(enclosure.type))
                        ? enclosure.url
                        : undefined;

                const mediaContent = (() => {
                    const mc = (it as any)["media:content"];
                    if (!mc) return undefined;
                    if (Array.isArray(mc)) return mc[0]?.url;
                    return mc?.url;
                })();

                const mediaThumb = (() => {
                    const mt = (it as any)["media:thumbnail"];
                    if (!mt) return undefined;
                    if (Array.isArray(mt)) return mt[0]?.url;
                    return mt?.url;
                })();

                const mediaGroup =
                    (it as any)?.["media:group"]?.["media:content"]?.url ||
                    (Array.isArray((it as any)?.["media:group"]?.["media:content"])
                        ? (it as any)["media:group"]["media:content"][0]?.url
                        : undefined);

                const html =
                    ((it as any)?.["content:encoded"] ||
                        (it as any)?.content ||
                        (it as any)?.summary ||
                        (it as any)?.contentSnippet ||
                        "") as string;

                const candidate =
                    encUrl || mediaContent || mediaThumb || mediaGroup || firstImageFromHtml(html) || null;

                items.push({
                    title: (it.title || link).trim(),
                    link,
                    pubDate: (it as any).isoDate || (it as any).pubDate,
                    source: sourceTitle,
                    image: absoluteHttps(candidate, link),
                });
            }
        } catch {
            /* ignore parse errors */
        }
    }

    // Dedupe by link
    const seen = new Set<string>();
    let deduped = items.filter((it) => {
        if (seen.has(it.link)) return false;
        seen.add(it.link);
        return true;
    });

    // Newest first
    deduped.sort((a, b) => {
        const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
        const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
        return tb - ta;
    });

    deduped = deduped.slice(0, limit);

    // Enhance a few with OG image if missing
    const enhanceCount = Math.min(deduped.length, 6);
    const enhanced = await Promise.all(
        deduped.map(async (it, idx) => {
            if (it.image || idx >= enhanceCount) return it;
            const og = await maybeFetchOgImage(it.link);
            return og ? { ...it, image: og } : it;
        })
    );

    return enhanced.slice(0, limit);
}
