// src/lib/proofs/normalize.ts
import type { ParsedProof } from "./types";

const NBSP = /\u00A0/g;

function clean(s?: string | null): string {
    return (s ?? "").replace(NBSP, " ").replace(/\s+/g, " ").trim();
}

// "26,84 (FAT)" -> "26.84"; "53.7h" -> "53.7"; "4:12.35" -> "4:12.35"
function stripAnnotationsToNumeric(s: string): string {
    const dec = s.replace(/,(\d{1,3})\b/, ".$1");
    const noParen = dec.replace(/\([^)]*\)/g, "");
    const onlyNum = noParen.replace(/[^\d:.]/g, "");
    return onlyNum.trim();
}

// "mm:ss.xx" | "ss.xx" -> seconds
function timeToSeconds(txt: string): number | null {
    const t = txt.trim();
    if (!t) return null;
    if (t.includes(":")) {
        const [m, s] = t.split(":");
        const mm = parseInt(m, 10);
        const ss = parseFloat(s);
        if (Number.isFinite(mm) && Number.isFinite(ss)) return mm * 60 + ss;
        return null;
    }
    const v = parseFloat(t);
    return Number.isFinite(v) ? v : null;
}

// Only ever return 'FAT' | 'hand' | null to match ParsedProof.timing
function detectTimingForParsed(markText: string): 'FAT' | 'hand' | null {
    const s = markText.toLowerCase();
    if (/\bhand\b/.test(s) || /\bh\)?\b/.test(s)) return "hand";
    if (/\bfat\b/.test(s) || /\bauto\b/.test(s)) return "FAT";
    return null; // collapse unknown/auto into null for schema compat
}

// INPUT: ParsedProof (possibly messy)
// OUTPUT: ParsedProof (clean, timing constrained to 'FAT' | 'hand' | null)
export function normalizeParsed(p: ParsedProof): ParsedProof {
    const markText = clean(p.markText);
    const numericTxt = stripAnnotationsToNumeric(markText);

    const secondsFromTxt = timeToSeconds(numericTxt);
    const seconds = Number.isFinite(p.markSeconds) ? p.markSeconds : secondsFromTxt;
    if (!Number.isFinite(seconds) || !seconds || seconds <= 0) {
        throw new Error(`normalizeParsed: could not derive numeric seconds from "${p.markText}"`);
    }

    const timing: 'FAT' | 'hand' | null =
        p.timing ?? detectTimingForParsed(markText);

    return {
        event: clean(p.event),
        markText,
        markSeconds: seconds!,
        timing,
        wind: p.wind ?? null,
        meetName: clean(p.meetName ?? ""),
        meetDate: p.meetDate ?? null,
        athleteName: clean(p.athleteName ?? ""),
        school: clean(p.school ?? ""),
        lane: clean(p.lane ?? ""),
        place: p.place ?? null,
    };
}
