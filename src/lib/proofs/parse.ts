// src/lib/proofs/parse.ts
import type { ParsedProof, ProofSource } from "@/lib/proofs/types";
import { parseAthleticNet } from "./providers/athleticnet";

export async function parseBySource(
    url: string
): Promise<{ source: ProofSource; parsed: ParsedProof }> {
    const host = new URL(url).hostname.toLowerCase();

    if (host.includes("athletic.net")) {
        const raw = await parseAthleticNet(url);

        // Coerce provider output to your strict ParsedProof type
        const parsed: ParsedProof = {
            event: raw.event ?? "",
            markText: raw.markText ?? "",
            markSeconds: raw.markSeconds ?? null,
            markMetric: (raw as any).markMetric ?? null,
            timing: raw.timing ?? null,
            wind: raw.wind ?? null,
            meetName: raw.meetName ?? "",
            meetDate: raw.meetDate ?? null,
            athleteName: (raw as any).athleteName ?? "",
            school: (raw as any).school ?? "",
            lane: (raw as any).lane ?? "",
            place: (raw as any).place ?? null,
        };

        // If your provider added a confidence hint, keep it attached for downstream readers
        if (typeof (raw as any).confidence === "number") {
            (parsed as any).confidence = (raw as any).confidence;
        }

        if ((raw as any).athleteSlug) {
            parsed.athleteSlug = (raw as any).athleteSlug;
        }
        return { source: "athleticnet", parsed };
    }

    if (host.includes("milesplit")) {
        throw new Error("Milesplit parser not implemented yet");
    }

    throw new Error("Unsupported source");
}
