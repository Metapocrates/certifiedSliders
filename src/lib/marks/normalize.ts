/**
 * Parse a track mark string into seconds.
 * Supports:
 *  - "14.76", "53.7h"
 *  - "4:12.35", "1:58.4h"
 *  - "1:02:03.45"
 * Ignores trailing wind flags like "w". Throws on DQ/DNF/DNS/NH/ND.
 */
export function parseMarkToSeconds(
    markText: string
): { seconds: number; timing?: 'FAT' | 'hand' } {
    if (!markText) throw new Error('Empty mark');
    const raw = markText.trim();

    // Non-time statuses
    if (/\b(DQ|DNF|DNS|NH|ND)\b/i.test(raw)) {
        throw new Error('Non-time mark');
    }

    // Detect hand timing via trailing "h"
    const compact = raw.replace(/\s+/g, '');
    const isHand = /h$/i.test(compact);

    // Keep only time-relevant chars (digits, colon, dot, optional trailing h)
    let s = raw.replace(/[^\dh:.\s]/gi, '').trim(); // drops things like "w", "A", etc.
    s = s.replace(/\s+/g, '');
    s = s.replace(/h$/i, ''); // remove 'h' for numeric parsing

    // hh:mm:ss(.xx)
    let m = s.match(/^(\d+):([0-5]?\d):([0-5]?\d(?:\.\d+)?)$/);
    if (m) {
        const h = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10);
        const ss = parseFloat(m[3]);
        return { seconds: h * 3600 + mm * 60 + ss, timing: isHand ? 'hand' : 'FAT' };
    }

    // mm:ss(.xx)
    m = s.match(/^(\d+):([0-5]?\d(?:\.\d+)?)$/);
    if (m) {
        const mm = parseInt(m[1], 10);
        const ss = parseFloat(m[2]);
        return { seconds: mm * 60 + ss, timing: isHand ? 'hand' : 'FAT' };
    }

    // ss(.xx)
    if (/^\d+(?:\.\d+)?$/.test(s)) {
        return { seconds: parseFloat(s), timing: isHand ? 'hand' : 'FAT' };
    }

    throw new Error('Unsupported mark format');
}

/** Optional: pretty-print seconds back to mm:ss.xx (no rounding policy baked in). */
export function formatSeconds(seconds: number): string {
    if (!isFinite(seconds)) return '';
    if (seconds < 60) return seconds.toFixed(seconds % 1 ? 2 : 0);
    const mm = Math.floor(seconds / 60);
    const ss = seconds - mm * 60;
    return `${mm}:${ss < 10 ? '0' : ''}${ss.toFixed(ss % 1 ? 2 : 0)}`;
}
