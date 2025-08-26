// lib/mark.ts
// — Utility to normalize a mark string -> seconds (for running events).
// Extensible for field events later (mark_metric).
//--------------------------------------------------------------------------
export type NormalizedMark = {
    mark_seconds: number | null;
    mark_metric: number | null; // reserved for field events (meters), if needed
};


const DNF_LIKE = ["DNF", "DQ", "DNS", "NM", "NT", "—", "-"]; // include common sentinels


export function normalizeMark(markRaw: string, event: string): NormalizedMark {
    if (!markRaw) return { mark_seconds: null, mark_metric: null };
    const mark = markRaw.trim().toUpperCase();
    if (DNF_LIKE.includes(mark)) return { mark_seconds: null, mark_metric: null };


    // Running events: accept `M:SS.xx`, `SS.xx`, or integer seconds `53`.
    // NOTE: We don't decide legality or auto conversions here (wind/hand).
    // The DB trigger handles adjusted time.
    // Examples: "53.76" -> 53.76; "1:53.21" -> 113.21; "14.7" -> 14.7
    const timeLike = /^(\d+):(\d{1,2}(?:\.\d{1,3})?)$/; // M:SS.xx
    const secsLike = /^(\d{1,3})(?:\.(\d{1,3}))?$/; // SS or SS.xxx


    const timeMatch = mark.match(timeLike);
    if (timeMatch) {
        const minutes = parseInt(timeMatch[1], 10);
        const secPart = parseFloat(timeMatch[2]);
        const total = minutes * 60 + secPart;
        return { mark_seconds: isFinite(total) ? total : null, mark_metric: null };
    }


    const secsMatch = mark.match(secsLike);
    if (secsMatch) {
        const seconds = parseFloat(mark);
        return { mark_seconds: isFinite(seconds) ? seconds : null, mark_metric: null };
    }


    // Field events placeholder (e.g., "22-04.5" long jump). Add when needed.
    // For now, if it's not parseable as time, return nulls.
    return { mark_seconds: null, mark_metric: null };
}