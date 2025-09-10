// lib/proofs/fetch.ts
export async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
    const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
            "User-Agent": "CertifiedSlidersBot/1.0 (+https://certifiedsliders.com)",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
        },
    });
    if (!res.ok) {
        throw new Error(`Fetch failed (${res.status})`);
    }
    const html = await res.text();
    const finalUrl = res.url || url;
    return { html, finalUrl };
}
