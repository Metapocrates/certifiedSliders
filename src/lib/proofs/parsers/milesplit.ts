// src/lib/proofs/parsers/milesplit.ts
import type { ParsedProof } from "../types";

/**
 * Minimal placeholder for https://<state>.milesplit.com/performance/<id>
 * (Selectors to be added later.)
 */
export async function parseMileSplitPerformance(url: string, html: string): Promise<ParsedProof> {
    const lower = url.toLowerCase();
    const event =
        lower.includes("110") && lower.includes("hurd") ? "110H" :
            lower.includes("300") && lower.includes("hurd") ? "300H" :
                lower.includes("400") && lower.includes("hurd") ? "400H" :
                    lower.includes("800") ? "800m" :
                        lower.includes("1600") ? "1600m" :
                            lower.includes("3200") ? "3200m" :
                                lower.includes("200") ? "200m" :
                                    lower.includes("100") ? "100m" :
                                        "—";

    return {
        event,
        markText: "12.34 (FAT)",
        markSeconds: 12.34,
        timing: null,
        wind: null,
        meetName: null,
        meetDate: null,
        athleteName: null,
        school: null,
        lane: null,
        place: null,
    };
}
