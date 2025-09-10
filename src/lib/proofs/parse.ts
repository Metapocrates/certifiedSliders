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
            markSeconds: raw.markSeconds ?? 0,          // if unknown, use 0 (ingest can treat 0 as invalid)
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

        return { source: "athleticnet", parsed };
    }

    if (host.includes("milesplit")) {
        throw new Error("Milesplit parser not implemented yet");
    }

    throw new Error("Unsupported source");
}
