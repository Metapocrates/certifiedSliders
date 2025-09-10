// src/lib/proofs/parsers/athleticnet.ts
import type { ParsedProof } from "../types";
import type * as cheerio from "cheerio";

/**
 * Strict parser for https://www.athletic.net/result/<id> pages.
 * Assumes /result/ layout; if the page isn't that layout, upstream should reject it.
 */
export async function parseAthleticNetResult(url: string, html: string): Promise<ParsedProof> {
    const ch = await import("cheerio");
    const $ = ch.load(html);
    const clean = (s?: string | null) =>
        (s ?? "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();

    // Event — often in a header near the performance
    const eventText =
        clean($(".performanceHeader h1").first().text()) ||
        clean($(".eventHeader h1").first().text()) ||
        clean($("h1").first().text()) ||
        clean($('meta[property="og:title"]').attr("content") || "") ||
        "";

    // Meet name & date
    const meetName =
        clean($(".meetHeader h1").first().text()) ||
        clean($(".meet-title").first().text()) ||
        clean($(".meetName").first().text()) ||
        clean($('meta[property="og:site_name"]').attr("content") || "") ||
        null;

    const timeEl = $("time[datetime]").first();
    const meetDate =
        (timeEl.attr("datetime") && clean(timeEl.attr("datetime")!)) ||
        guessISODate(clean($(".meet-date").first().text())) ||
        guessISODate(clean($("time").first().text())) ||
        null;

    // Mark / time
    const markRawCell =
        clean($(".performance-time").first().text()) ||
        clean($(".mark").first().text()) ||
        clean($("td.time").first().text()) ||
        "";

    const ogDesc = clean($('meta[property="og:description"]').attr("content") || "");
    const pageText = clean($("body").text());
    const markText = pickBestMark([markRawCell, ogDesc, pageText]) || "0.00";

    const markSeconds = deriveSeconds(markText);

    const timing: "FAT" | "hand" | null =
        /\b(hand|h\)?)\b/i.test(markText) ? "hand" :
            /\b(fat|auto)\b/i.test(markText) ? "FAT" :
                null;

    // Wind (if present on sprints)
    const windTxt =
        clean($(".wind, td.wind").first().text()) || findWindAnywhere($) || "";
    const windMatch = windTxt.match(/([+-]?\d+(?:\.\d+)?)\s*m\/s/i);
    const wind = windMatch ? parseFloat(windMatch[1]) : null;

    const event = normalizeEvent(eventText) || guessEventFromText(eventText) || "—";

    return {
        event,
        markText,
        markSeconds,
        timing,
        wind,
        meetName,
        meetDate,
        athleteName: null,
        school: null,
        lane: null,
        place: null,
    };
}

// ---------- helpers ----------
function deriveSeconds(markText: string): number {
    const t = markText
        .replace(/,(\d{1,3})\b/, ".$1")
        .replace(/\([^)]*\)/g, "")
        .replace(/[^\d:.]/g, "")
        .trim();
    if (!t) return NaN as unknown as number;

    if (t.includes(":")) {
        const [m, s] = t.split(":");
        const mm = parseInt(m, 10);
        const ss = parseFloat(s);
        if (Number.isFinite(mm) && Number.isFinite(ss)) return mm * 60 + ss;
    } else {
        const v = parseFloat(t);
        if (Number.isFinite(v)) return v;
    }
    return NaN as unknown as number;
}

function normalizeEvent(ev: string): string {
    const s = ev.toLowerCase();
    if (s.includes("hurd")) {
        if (s.includes("110")) return "110H";
        if (s.includes("300")) return "300H";
        if (s.includes("400")) return "400H";
    }
    if (/\b100\b/.test(s)) return "100m";
    if (/\b200\b/.test(s)) return "200m";
    if (/\b400\b/.test(s)) return "400m";
    if (/\b800\b/.test(s)) return "800m";
    if (/\b1500\b/.test(s)) return "1500m";
    if (/\b1600\b/.test(s)) return "1600m";
    if (/\b3200\b/.test(s)) return "3200m";
    if (/\b5000\b/.test(s)) return "5000m";
    return ev.trim();
}

function guessEventFromText(s: string): string | null {
    const low = s.toLowerCase();
    if (/110.*hurd/.test(low)) return "110H";
    if (/300.*hurd/.test(low)) return "300H";
    if (/400.*hurd/.test(low)) return "400H";
    const m = low.match(/\b(100|200|400|800|1500|1600|3200|5000)\b/);
    return m ? `${m[1]}m` : null;
}

function guessISODate(s: string): string | null {
    if (!s) return null;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    const m = s.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
    if (m) {
        const d2 = new Date(`${m[1]} ${m[2]} ${m[3]}`);
        if (!isNaN(d2.getTime())) return d2.toISOString().slice(0, 10);
    }
    return null;
}

function pickBestMark(candidates: string[]): string | null {
    for (const c of candidates) {
        const s = c || "";
        const mmss = s.match(/\b\d{1,2}:\d{2}(?:\.\d{1,3})?\b/);
        if (mmss) return mmss[0];
        const ssprec = s.match(/\b\d{1,3}\.\d{2,3}\b(?!\s*m\/s)/);
        if (ssprec) return ssprec[0];
        const sslite = s.match(/\b\d{1,3}\.\d\b(?!\s*m\/s)/);
        if (sslite) return sslite[0];
    }
    return null;
}

function findWindAnywhere($: cheerio.CheerioAPI): string | null {
    const page = $("body").text();
    const m = page.match(/([+-]?\d+(?:\.\d+)?)\s*m\/s/i);
    return m ? m[0] : null;
}
