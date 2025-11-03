// src/lib/proofs/providers/athleticnet.ts
import { fetchHtml } from "../fetch";

type Timing = "FAT" | "hand" | null;

type Parsed = {
    event: string | null;
    markText: string | null;
    markSeconds: number | null;
    timing: Timing;
    wind: number | null;
    meetName: string | null;
    meetDate: string | null;
    athleteName?: string | null;
    school?: string | null;
    lane?: string | null;
    place?: number | null;
    confidence?: number;
};

const BAD_TITLES = new Set([
    "track & field and cross country statistics",
    "athletic.net",
]);

// ---------- helpers ----------
const RX_H_MM_SS = /\b(\d+):([0-5]\d):([0-5]\d(?:\.\d+)?)\b/;
const RX_M_SS = /\b(\d+):([0-5]\d(?:\.\d+)?)\b/;
const RX_SS = /\b(\d{1,3}(?:\.\d+))s?\b/i; // require decimal; accept trailing 's'

function toSecondsFromString(s: string): number | null {
    let m = s.match(RX_H_MM_SS);
    if (m) {
        const h = parseInt(m[1], 10), mm = parseInt(m[2], 10), ss = parseFloat(m[3]);
        return h * 3600 + mm * 60 + ss;
    }
    m = s.match(RX_M_SS);
    if (m) {
        const mm = parseInt(m[1], 10), ss = parseFloat(m[2]);
        return mm * 60 + ss;
    }
    m = s.match(RX_SS);
    return m ? parseFloat(m[1]) : null;
}

function clampWind(w: number | null): number | null {
    if (w == null || !isFinite(w)) return null;
    return Math.abs(w) <= 6 ? w : null;
}

function parseWindBlob(text: string): number | null {
    const m = text.match(/(?:Wind|W:)\s*([+-]?\d+(?:\.\d+)?)\s*m\/s/i) || text.match(/\b([+-]\d+(?:\.\d+)?)\s*m\/s\b/i);
    return m ? clampWind(parseFloat(m[1])) : null;
}

function parseTimingBlob(text: string): Timing {
    if (/\bFAT\b/i.test(text)) return "FAT";
    if (/\b(hand|HT)\b/i.test(text)) return "hand";
    return null;
}

function normalizeEventToken(human: string): string | null {
    const s = human.replace(/\u2026/g, "...").trim(); // normalize ellipsis

    // Field events - throwing
    if (/\bShot\s*Put\b/i.test(s)) return "SP";
    if (/\bDiscus(?:\s+Throw)?\b/i.test(s)) return "DT";
    if (/\bJavelin(?:\s+Throw)?\b/i.test(s)) return "JT";
    if (/\bHammer(?:\s+Throw)?\b/i.test(s)) return "HM";

    // Field events - jumping
    if (/\bLong\s*Jump\b/i.test(s)) return "LJ";
    if (/\bTriple\s*Jump\b/i.test(s)) return "TJ";
    if (/\bHigh\s*Jump\b/i.test(s)) return "HJ";
    if (/\bPole\s*Vault\b/i.test(s)) return "PV";

    // Hurdles - match "110m Hurdles", "110 Hurdles", "110 Meter Hurdles", etc.
    let m = s.match(/\b(60|80|100|110|200|300|400)\s*(?:m(?:eter)?s?)?\s*Hurdles\b/i);
    if (m) return `${m[1]}H`;

    // Flats - match "100m", "100 m", "100 Meters", "100 Meter", etc.
    m = s.match(/\b(60|100|200|300|400|800|1600|3200|5000|10000)\s*(?:m(?:eters?)?)\b/i);
    return m ? `${m[1]}m` : null;
}

function eventRangeSeconds(event: string | null): [number, number] | null {
    if (!event) return null;
    const map: Record<string, [number, number]> = {
        "60m": [6, 15], "100m": [9, 20], "200m": [19, 40], "300m": [32, 90], "400m": [40, 120],
        "800m": [90, 240], "1600m": [220, 600], "3200m": [480, 1500], "5000m": [780, 2400], "10000m": [1500, 4500],
        "60H": [7, 18], "80H": [9, 22], "100H": [11, 25], "110H": [10, 25], "300H": [34, 80], "400H": [45, 120],
    };
    return map[event] ?? null;
}

function extractDateFromTitleOrLabels(title: string | null, labelsText: string): string | null {
    const tryStrs = [title ?? "", labelsText];
    for (const s of tryStrs) {
        const m = s.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.? \d{1,2}, \d{4}\b/i);
        if (m) {
            const dt = new Date(m[0]);
            if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
        }
    }
    return null;
}

function extractLabeled(text: string, label: string): string | null {
    // Matches "label - value" where value may end with ellipsis
    const rx = new RegExp(`\\b${label}\\s*[-–—:]\\s*([^\\n\\r|]+)`, "i");
    const m = text.match(rx);
    if (!m) return null;
    return m[1].trim();
}

function extractEvent(title: string | null, labelsText: string, body: string): string | null {
    // 1) label block has explicit event
    const lab = extractLabeled(labelsText, "event");
    const fromLabel = lab ? normalizeEventToken(lab) : null;
    if (fromLabel) return fromLabel;

    // 2) title often has "... - 110m Hurdles - ..."
    if (title) {
        const fromTitle = normalizeEventToken(title);
        if (fromTitle) return fromTitle;
    }

    // 3) body fallback
    const bodyHuman =
        // Field events
        body.match(/\bShot\s*Put\b/i)?.[0] ||
        body.match(/\bDiscus(?:\s+Throw)?\b/i)?.[0] ||
        body.match(/\bJavelin(?:\s+Throw)?\b/i)?.[0] ||
        body.match(/\bHammer(?:\s+Throw)?\b/i)?.[0] ||
        body.match(/\bLong\s*Jump\b/i)?.[0] ||
        body.match(/\bTriple\s*Jump\b/i)?.[0] ||
        body.match(/\bHigh\s*Jump\b/i)?.[0] ||
        body.match(/\bPole\s*Vault\b/i)?.[0] ||
        // Running events
        body.match(/\b(60|80|100|110|200|300|400)\s*(?:m(?:eter)?s?)?\s*Hurdles\b/i)?.[0] ||
        body.match(/\b(60|100|200|300|400|800|1600|3200|5000|10000)\s*(?:m(?:eters?)?)\b/i)?.[0] ||
        "";
    return normalizeEventToken(bodyHuman);
}

// Extract distance marks for field events (feet/inches or meters)
function extractDistance(title: string | null, labelsText: string, body: string): { markText: string | null; markMetric: number | null } {
    // Try title first, then labels, then body
    const tryStrs = [title ?? "", labelsText, body];

    for (const s of tryStrs) {
        // Match feet/inches format FIRST (e.g., "40' 8\"", "40' 8"" with typographic or ASCII quotes)
        // Unicode: \u2018\u2019 ('' curly single), \u201C\u201D ("" curly double), \u02BC (modifier apostrophe), \u2032 (prime), \u2033 (double prime)
        // Patterns: "40' 8\"", "40'8\"", "40′ 8″", "40-8"
        // Requires either: quote after feet, OR whitespace/dash separator
        const imperialMatch = s.match(/(\d+)(?:['\u2018\u2019\u02BC\u2032]\s*|(?:\s*-\s*|\s+))(\d+(?:\.\d+)?)\s*["\u201C\u201D\u02BA\u2033]?(?!\d)/);
        if (imperialMatch) {
            const feet = parseInt(imperialMatch[1], 10);
            const inches = parseFloat(imperialMatch[2]);
            if (feet >= 0 && feet < 200 && inches >= 0 && inches < 12) {
                // Convert to meters
                const meters = (feet * 0.3048) + (inches * 0.0254);
                return { markText: `${feet}' ${inches}"`, markMetric: meters };
            }
        }

        // Match metric (e.g., "12.40m" or "12.40M")
        const metricMatch = s.match(/\b(\d+(?:\.\d+)?)\s*m\b/i);
        if (metricMatch) {
            const meters = parseFloat(metricMatch[1]);
            if (meters > 0 && meters < 100) { // sanity check
                return { markText: `${meters}m`, markMetric: meters };
            }
        }
    }

    return { markText: null, markMetric: null };
}

function extractTime(title: string | null, labelsText: string, body: string): { markText: string | null; markSeconds: number | null } {
    // 1) label time (often "14.76s")
    const lab = extractLabeled(labelsText, "time") || extractLabeled(labelsText, "result") || extractLabeled(labelsText, "performance");
    if (lab) {
        const sec = toSecondsFromString(lab);
        if (sec != null) return { markText: lab.replace(/\s*s$/i, ""), markSeconds: sec };
    }
    // 2) title contains "... - 14.76 - ..."
    if (title) {
        const sec = toSecondsFromString(title);
        if (sec != null) {
            const tok = title.match(RX_H_MM_SS)?.[0] ?? title.match(RX_M_SS)?.[0] ?? title.match(RX_SS)?.[0] ?? `${sec}`;
            return { markText: tok.replace(/\s*s$/i, ""), markSeconds: sec };
        }
    }
    // 3) body fallback: prefer tokens with decimal
    const sec = toSecondsFromString(body);
    if (sec != null) {
        const tok = body.match(RX_H_MM_SS)?.[0] ?? body.match(RX_M_SS)?.[0] ?? body.match(RX_SS)?.[0] ?? `${sec}`;
        return { markText: tok.replace(/\s*s$/i, ""), markSeconds: sec };
    }
    return { markText: null, markSeconds: null };
}
function humanEventFromNorm(event: string | null): string | null {
    if (!event) return null;

    // Field events - throws
    const fieldEventMap: Record<string, string> = {
        "SP": "Shot Put",
        "DT": "Discus",
        "JT": "Javelin",
        "HM": "Hammer",
        "LJ": "Long Jump",
        "TJ": "Triple Jump",
        "HJ": "High Jump",
        "PV": "Pole Vault",
    };

    if (fieldEventMap[event]) return fieldEventMap[event];

    // Hurdles
    if (/H$/.test(event)) return `${event.replace(/H$/, "")}m Hurdles`; // "110H" -> "110m Hurdles"

    // Running events
    if (/m$/.test(event)) return event;                                // "400m"

    return null;
}

function cleanMeetName(s: string | null): string | null {
    if (!s) return null;
    return s.replace(/\u2026/g, "...").replace(/\s+/g, " ").trim();
}

function extractMeetNameFromTitle(
    title: string,
    eventNorm: string | null
): string | null {
    // Title format often:
    // "<Athlete> - <Team> - <Time> - <Event> - <Meet> - <Date>"
    const parts = title.split(/\s+-\s+/);

    // find date segment (e.g., "Jul 27, 2025")
    const dateIdx = parts.findIndex((p) =>
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.? \d{1,2}, \d{4}\b/i.test(p)
    );

    // find event segment (prefer normalized -> human, otherwise pattern)
    const eventHuman = humanEventFromNorm(eventNorm);
    let eventIdx = -1;
    if (eventHuman) {
        eventIdx = parts.findIndex((p) =>
            p.toLowerCase().includes(eventHuman.toLowerCase())
        );
    }
    if (eventIdx === -1) {
        eventIdx = parts.findIndex(
            (p) =>
                // Running events
                /\b(60|80|100|110|200|300|400)\s*m\s*Hurdles\b/i.test(p) ||
                /\b(60|100|200|300|400|800|1600|3200|5000|10000)\s*(?:m(?:eters?)?)\b/i.test(p) ||
                // Field events
                /\bShot\s*Put\b/i.test(p) ||
                /\bDiscus(?:\s+Throw)?\b/i.test(p) ||
                /\bJavelin(?:\s+Throw)?\b/i.test(p) ||
                /\bHammer(?:\s+Throw)?\b/i.test(p) ||
                /\bLong\s*Jump\b/i.test(p) ||
                /\bTriple\s*Jump\b/i.test(p) ||
                /\bHigh\s*Jump\b/i.test(p) ||
                /\bPole\s*Vault\b/i.test(p)
        );
    }

    if (eventIdx === -1) {
        // fallback: try to pick the longest middle segment that isn’t a time or user/team
        const middle = parts.slice(2, dateIdx > -1 ? dateIdx : parts.length);
        const candidates = middle.filter(
            (p) => !toSecondsFromString(p) && !/\b(user|team|club)\b/i.test(p)
        );
        if (!candidates.length) return null;
        const meetGuess = candidates.reduce((a, b) => (a.length >= b.length ? a : b));
        return cleanMeetName(meetGuess);
    }

    // meet typically follows the event, up to (but not including) the date
    const end = dateIdx > -1 ? dateIdx : parts.length;
    let candidates = parts.slice(eventIdx + 1, end);

    // filter out obvious non-meet tokens
    candidates = candidates.filter(
        (p) =>
            !toSecondsFromString(p) && // drop time tokens like "14.76"
            !/\b(heat|final|prelim|round|section)\b/i.test(p)
    );

    if (!candidates.length) return null;
    // choose the longest remaining segment
    const meet = candidates.reduce((a, b) => (a.length >= b.length ? a : b));
    return cleanMeetName(meet);
}

function extractMeetName(
    title: string | null,
    labelsText: string,
    eventNorm: string | null
): string | null {
    // Prefer explicit labeled field (clean and short)
    const fromLabel = extractLabeled(labelsText, "meet");
    if (fromLabel) return cleanMeetName(fromLabel);

    // Fallback to title heuristics
    if (title) {
        // Strip common Athletic.net suffixes
        let cleanedTitle = title
            .replace(/\s*[-|]\s*Track\s*&\s*Field\s+and\s+Cross\s+Country\s+Statistics.*$/i, "")
            .replace(/\s*[-|]\s*Athletic\.net.*$/i, "")
            .trim();

        const fromTitle = extractMeetNameFromTitle(
            cleanedTitle,
            eventNorm
        );
        if (fromTitle) return fromTitle;
    }
    return null;
}

// ---------- main ----------
export async function parseAthleticNet(url: string): Promise<Parsed & { athleteSlug?: string | null }> {
    const { html, finalUrl } = await fetchHtml(url);

    // Title & base text
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || null;
    const lowerTitle = (title || "").toLowerCase();
    if (BAD_TITLES.has(lowerTitle)) {
        return { event: null, markText: null, markSeconds: null, markMetric: null, timing: null, wind: null, meetName: null, meetDate: null, confidence: 0 };
    }

    const body = html
        .replace(/<script[^>]*>.*?<\/script>/gis, " ")
        .replace(/<style[^>]*>.*?<\/style>/gis, " ")
        .replace(/\s+/g, " ");

    // Build a compact “labels block” from common summary UI areas
    // (This is a heuristic: it works whether these appear in a table, list, or plain divs.)
    const labelsText = body
        .replace(/<\/?(?:tr|td|th|li|div|span|p)[^>]*>/gi, "|") // turn elements into separators
        .replace(/\|+/g, "|")
        .replace(/\s*\|\s*/g, " | ")
        .replace(/\s+/g, " ");

    // Extract fields
    const event = extractEvent(title, labelsText, body);

    // Determine if this is a field event (throws/jumps) or running event
    const fieldEvents = ['SP', 'DT', 'JT', 'HM', 'LJ', 'TJ', 'HJ', 'PV'];
    const isFieldEvent = event ? fieldEvents.includes(event) : false;

    // Extract mark based on event type
    let markText: string | null = null;
    let markSeconds: number | null = null;
    let markMetric: number | null = null;

    if (isFieldEvent) {
        const distance = extractDistance(title, labelsText, body);
        markText = distance.markText;
        markMetric = distance.markMetric;
    } else {
        const time = extractTime(title, labelsText, body);
        markText = time.markText;
        markSeconds = time.markSeconds;
    }

    const timing = parseTimingBlob(body);
    const wind = clampWind(parseWindBlob(body));

    const meetName: string | null = extractMeetName(title, labelsText, event);


    const meetDate = extractDateFromTitleOrLabels(title, labelsText);

    // sanity-check mark by event range
    const rng = eventRangeSeconds(event);
    if (rng && markSeconds != null) {
        const [lo, hi] = rng;
        if (markSeconds < lo || markSeconds > hi) {
            // reject clearly implausible marks for that event
            // (prevents '1' or '9999' being accepted)
            // eslint-disable-next-line no-param-reassign
            // @ts-ignore - we reassign local constants via new vars
            // We'll just null them via locals:
            const _ = null;
            // Recompute as nulls for output:
            return {
                event,
                markText: null,
                markSeconds: null,
                markMetric: null,
                timing,
                wind,
                meetName,
                meetDate,
                confidence: 0,
            };
        }
    }

    // Confidence scoring
    let confidence = 0;
    if (event && (markSeconds != null || markMetric != null)) {
        confidence = 0.7;
        if (meetName) confidence += 0.1;
        if (meetDate) confidence += 0.05;
        if (timing) confidence += 0.05;
        if (wind != null) confidence += 0.05;
        if (confidence > 0.98) confidence = 0.98;
    }

    const slugMatchers: RegExp[] = [
        /href="(?:https?:\/\/(?:www\.)?athletic\.net)?\/profile\/([A-Za-z0-9_-]+)/i,
        /href="(?:https?:\/\/(?:www\.)?athletic\.net)?\/athlete\/([A-Za-z0-9_-]+)/i,
        /data-athlete-id="([A-Za-z0-9-]+)"/i,
        /"athleteId"\s*[:=]\s*"([A-Za-z0-9-]+)"/i,
        /"profileUrl"\s*:\s*"(?:https?:\/\/(?:www\.)?athletic\.net)?\/profile\/([A-Za-z0-9_-]+)"/i,
    ];

    let athleteSlug: string | null = null;
    for (const rx of slugMatchers) {
        const m = html.match(rx);
        if (m && m[1]) {
            athleteSlug = m[1];
            break;
        }
    }

    return {
        event,
        markText,
        markSeconds,
        markMetric,
        timing,
        wind,
        meetName,
        meetDate,
        confidence,
        athleteSlug,
    };
}
