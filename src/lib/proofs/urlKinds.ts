// src/lib/proofs/urlKinds.ts

export type LinkKind =
    | "athleticnet_result"
    | "milesplit_performance"
    | "unsupported";

const ATHLETIC_RESULT_RE =
    /^https?:\/\/([a-z0-9-]+\.)*athletic\.net\/result\/[A-Za-z0-9]+/i;

// MileSplit performance URLs vary by region; this pattern covers common forms like
// milesplit.com/performance/<id> and <state>.milesplit.com/performance/<id>
const MILESPLIT_PERF_RE =
    /^https?:\/\/([a-z0-9-]+\.)*milesplit\.com\/performance\/\d+/i;

export function classifyLink(raw: string): LinkKind {
    try {
        const u = new URL(raw);
        const href = u.href.replace(/\/+$/, ""); // strip trailing '/'
        if (ATHLETIC_RESULT_RE.test(href)) return "athleticnet_result";
        if (MILESPLIT_PERF_RE.test(href)) return "milesplit_performance";
        return "unsupported";
    } catch {
        return "unsupported";
    }
}

export function rejectionMessageForUnsupported(raw: string): string {
    return (
        "Please submit a direct result link.\n" +
        "Examples:\n" +
        "• Athletic.net: https://www.athletic.net/result/<id>\n" +
        "• MileSplit:   https://<state>.milesplit.com/performance/<id>\n\n" +
        "Avoid general pages like /post/, /meet/, or /athlete/."
    );
}
