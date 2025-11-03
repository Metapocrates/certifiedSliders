// src/app/api/proofs/ingest/route.ts
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { parseAthleticNet as parseAthleticNetNew } from "@/lib/proofs/providers/athleticnet";

export const runtime = "nodejs";

type ParsedProof = {
    event: string;
    markText: string;
    markSeconds: number | null;
    markMetric?: number | null; // for field events (distance in meters)
    timing: "FAT" | "hand" | null;
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

async function parseAthleticNet(url: string) {
    try {
        // Use the new, improved parser
        const result = await parseAthleticNetNew(url);

        // Check if we got a generic/blocked page
        if (!result.event && !result.markText && result.confidence === 0) {
            return {
                ok: false,
                error: "Blocked or generic page returned. Please try again or paste page HTML.",
                parsed: null as ParsedProof | null,
            };
        }

        const parsed: ParsedProof = {
            event: result.event || "",
            markText: result.markText || "",
            markSeconds: result.markSeconds,
            markMetric: result.markMetric,
            timing: result.timing,
            wind: result.wind,
            meetName: result.meetName || "Athletic.net",
            meetDate: result.meetDate || "",
            confidence: result.confidence,
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
    } catch (error: any) {
        return {
            ok: false,
            error: error.message || "Failed to parse Athletic.net page",
            parsed: null as ParsedProof | null,
        };
    }
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
            // Use the new parser which handles fetching internally
            parsedBlock = await parseAthleticNet(url);
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
