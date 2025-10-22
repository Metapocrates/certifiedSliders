// src/app/api/proofs/ingest/route.ts
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

type ParsedProof = {
    event: string;
    markText: string;
    markSeconds: number | null;
    timing: "FAT" | "Hand" | null;
    wind: number | null;
    meetName: string;
    meetDate: string; // YYYY-MM-DD
    confidence?: number;
};

function toSeconds(text: string): number | null {
    const t = text.trim();
    if (!t) return null;

    // h:mm:ss(.xx) or mm:ss(.xx)
    const colon = /^(\d{1,2}:){1,2}\d{1,2}(\.\d{1,2})?$/;
    if (colon.test(t)) {
        const parts = t.split(":");
        let total = 0;
        let mult = 1;
        while (parts.length) {
            const seg = parts.pop()!;
            const v = parseFloat(seg);
            if (Number.isNaN(v)) return null;
            total += v * mult;
            mult *= 60;
        }
        return total;
    }

    // plain seconds
    const s = parseFloat(t);
    return Number.isNaN(s) ? null : s;
}

function normDate(s?: string): string {
    if (!s) return "";
    const iso = s.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const m = s.match(
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(20\d{2})\b/i
    );
    if (m) {
        const monthMap: Record<string, string> = {
            jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
            jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
        };
        const mm = monthMap[m[1].slice(0, 3).toLowerCase()];
        const dd = m[2].padStart(2, "0");
        return `${m[3]}-${mm}-${dd}`;
    }
    return "";
}

function cleanMeetName(s?: string) {
    if (!s) return "";
    return s.replace(/\s*[-–]\s*Athletic\.net\s*$/i, "").trim();
}

function extractWind(text: string): number | null {
    const w = text.match(/[+\-]\s?\d(?:\.\d)?\s*m\/s/i);
    if (!w) return null;
    const num = parseFloat(w[0].replace(/[^\d.+-]/g, ""));
    return Number.isFinite(num) ? num : null;
}

function guessEventFromTitleOrUrl(rawTitle: string, url: URL): string {
    const title = rawTitle || "";
    const path = url.pathname.toLowerCase();

    const rx =
        /\b(4x1(?:00|60)|4x2(?:00)?|4x4(?:00)?|4x8(?:00)?|\d{2,4}m|mile|2 mile|long jump|triple jump|high jump|pole vault|shot put|discus|javelin|110m hurdles|300m hurdles|60m hurdles)\b/i;

    const hit = title.match(rx) || path.match(rx);
    return hit ? hit[0] : "";
}

function nearbyCellMark($: cheerio.CheerioAPI): string {
    const labelRx = /(time|mark|result)/i;
    let val = "";

    $("tr").each((_, tr) => {
        if (val) return;
        const $tr = $(tr);
        const tds = $tr.find("td,th").toArray().map((el) => $(el).text().trim());
        if (tds.length >= 2 && labelRx.test(tds[0])) {
            const cand = tds[1];
            if (!/m\/s/i.test(cand)) val = cand; // avoid wind
        }
    });

    return (val || "").trim();
}

function bestTimeFromText(bigText: string): { markText: string; seconds: number | null } {
    // reject tokens adjacent to m/s (wind)
    const candidates =
        bigText.match(/\b\d{1,2}:\d{2}(?:\.\d{1,2})?|\b\d{1,2}\.\d{1,2}\b/g) || [];
    for (const cand of candidates) {
        const i = bigText.indexOf(cand);
        const window = bigText
            .slice(Math.max(0, i - 6), i + cand.length + 6)
            .toLowerCase();
        if (/m\/s/.test(window)) continue; // wind, skip
        if (!cand.includes(":")) {
            const v = parseFloat(cand);
            if (v < 3) continue; // tiny decimals likely wind or noise
        }
        return { markText: cand, seconds: toSeconds(cand) };
    }
    return { markText: "", seconds: null };
}

function parseAthleticNet(html: string, url: URL) {
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr("content") || "";
    const pageTitle = $("title").text().trim() || ogTitle;
    const metaDesc = $('meta[name="description"]').attr("content") || "";
    const ogDesc = $('meta[property="og:description"]').attr("content") || "";
    const bigText = [pageTitle, metaDesc, ogDesc, $("main").text(), $("body").text()]
        .filter(Boolean)
        .join("\n");

    // If we only got the generic site title, call it out early.
    const genericTitle = /Track\s*&\s*Field,\s*Cross\s*Country Results/i.test(pageTitle);
    if (genericTitle) {
        return {
            ok: false,
            error: "Blocked or generic page returned. Please try again or paste page HTML.",
            parsed: null as ParsedProof | null,
        };
    }

    const event = guessEventFromTitleOrUrl(pageTitle, url);
    const meetName =
        cleanMeetName(ogTitle) || cleanMeetName(pageTitle) || "Athletic.net";

    const metaDate =
        $('meta[itemprop="startDate"]').attr("content") ||
        $('time[itemprop="startDate"]').attr("datetime") ||
        $('meta[property="event:start_time"]').attr("content") ||
        "";
    const meetDate = normDate(metaDate) || normDate(bigText);

    // Try precise table read first, then text sweep
    let markText = nearbyCellMark($);
    if (!markText) {
        const t = bestTimeFromText(bigText);
        markText = t.markText;
    }

    let markSeconds: number | null = null;
    if (markText) {
        if (!/^\d{1,2}-\d{1,2}$/.test(markText)) {
            markSeconds = toSeconds(markText);
        }
    }

    let timing: "FAT" | "Hand" | null = null;
    if (/\bFAT\b/i.test(bigText)) timing = "FAT";
    else if (/\bhand[-\s]?timed\b/i.test(bigText)) timing = "Hand";

    const wind = extractWind(bigText);

    let confidence = 0.2;
    if (event) confidence += 0.3;
    if (markText) confidence += 0.3;
    if (meetDate) confidence += 0.1;
    if (timing) confidence += 0.1;
    if (confidence > 0.95) confidence = 0.95;

    const parsed: ParsedProof = {
        event,
        markText,
        markSeconds,
        timing,
        wind,
        meetName,
        meetDate,
        confidence,
    };

    const hasCore =
        (parsed.event && parsed.event.trim()) ||
        (parsed.markText && parsed.markText.trim());

    if (!hasCore) {
        return {
            ok: false,
            error:
                "Parsed successfully, but no structured fields were returned. Paste HTML or use a direct result URL.",
            parsed,
        };
    }

    return { ok: true, error: null, parsed };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const url = String(body?.url || "");
        const pastedHtml = typeof body?.html === "string" ? body.html : null;

        if (!url) {
            return NextResponse.json(
                { ok: false, error: "Missing 'url'." },
                { status: 400 }
            );
        }

        const u = new URL(url);
        const host = u.hostname.toLowerCase();
        const isAthleticNet =
            /(^|\.)athletic\.net$/i.test(host) || /athletic\.net/i.test(host);

        let parsedBlock:
            | { ok: boolean; error: string | null; parsed: ParsedProof | null }
            | null = null;
        let source: "athleticnet" | "milesplit" | "other" = "other";

        if (isAthleticNet) {
            source = "athleticnet";

            // If HTML was pasted (fallback), parse directly.
            if (pastedHtml && pastedHtml.trim().length > 200) {
                parsedBlock = parseAthleticNet(pastedHtml, u);
            } else {
                // Try to fetch the page
                const resp = await fetch(url, {
                    method: "GET",
                    headers: {
                        "user-agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                        "accept-language": "en-US,en;q=0.9",
                        accept: "text/html,application/xhtml+xml",
                        referer: "https://www.google.com/",
                    },
                    redirect: "follow",
                    cache: "no-store",
                });

                if (!resp.ok) {
                    return NextResponse.json({
                        ok: false,
                        source,
                        error: `Could not load page (${resp.status}).`,
                    });
                }

                // Guard against cross-domain redirect
                const finalURL = new URL(resp.url || url);
                if (finalURL.hostname !== u.hostname) {
                    return NextResponse.json({
                        ok: false,
                        source,
                        error:
                            "Unexpected redirect away from Athletic.net. Try again or paste the page HTML.",
                    });
                }

                const html = await resp.text();
                if (!html || html.length < 500) {
                    return NextResponse.json({
                        ok: false,
                        source,
                        error:
                            "Received an unusually small response. Site may be blocking automated fetch. Paste HTML instead.",
                    });
                }

                parsedBlock = parseAthleticNet(html, u);
            }
        } else {
            source = host.includes("milesplit") ? "milesplit" : "other";
            parsedBlock = {
                ok: false,
                error: "Only Athletic.net is supported for MVP.",
                parsed: {
                    event: "",
                    markText: "",
                    markSeconds: null,
                    timing: null,
                    wind: null,
                    meetName: host.replace(/^www\./, "") || "Unknown",
                    meetDate: "",
                    confidence: 0.1,
                },
            };
        }

        const normalized = parsedBlock?.parsed ?? null;

        return NextResponse.json({
            ok: Boolean(parsedBlock?.ok && normalized),
            source,
            parsed: normalized,
            normalized,
            ...(parsedBlock?.ok ? {} : { error: parsedBlock?.error || "Parse failed." }),
        });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message || "Failed to parse URL." },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;