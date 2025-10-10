// src/app/api/proofs/ingest/route.ts
import { NextResponse } from "next/server";

// If you have server auth, uncomment and use it
// import { getSessionUser } from "@/lib/auth";
// import { createSupabaseServer } from "@/lib/supabase/compat";

type In = { url?: string };
type Normalized = {
    source: "athleticnet" | "milesplit" | "other";
    proof_url: string;
    event?: string;
    markText?: string;
    markSeconds?: number | null;
    timing?: "FAT" | "Hand" | null;
    wind?: number | null;
    meetName?: string;
    meetDate?: string; // YYYY-MM-DD
    confidence?: number;
};

function detectSource(url: string): Normalized["source"] {
    const u = url.toLowerCase();
    if (u.includes("athletic.net")) return "athleticnet";
    if (u.includes("milesplit")) return "milesplit";
    return "other";
}

// ---- Put your real parsers here ----
// For now, this demo tries a debug endpoint if you already have one.
// Replace this with direct parser calls if available.
async function tryParseViaDebug(url: string): Promise<any | null> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/proofs/parse-debug`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
            // In dev, absolute URL may be missing; if so, bail gracefully.
            cache: "no-store",
        });
        if (!res.ok) return null;
        return await res.json().catch(() => null);
    } catch {
        return null;
    }
}

function normalizePayload(url: string, raw: any): Normalized {
    // Accept a variety of possible keys from older parsers
    const event = raw?.event ?? raw?.Event ?? undefined;
    const markText = raw?.markText ?? raw?.mark ?? raw?.best_mark_text ?? undefined;
    const markSeconds =
        typeof raw?.markSeconds === "number"
            ? raw.markSeconds
            : typeof raw?.mark_seconds_adj === "number"
                ? raw.mark_seconds_adj
                : typeof raw?.best_seconds_adj === "number"
                    ? raw.best_seconds_adj
                    : null;
    const timing =
        raw?.timing === "FAT" || raw?.timing === "Hand" ? raw.timing : null;
    const wind =
        typeof raw?.wind === "number"
            ? raw.wind
            : typeof raw?.wind_mps === "number"
                ? raw.wind_mps
                : null;
    const meetName = raw?.meetName ?? raw?.meet_name ?? undefined;
    const meetDate = raw?.meetDate ?? raw?.meet_date ?? undefined;
    const confidence =
        typeof raw?.confidence === "number" ? raw.confidence : undefined;

    return {
        source: detectSource(url),
        proof_url: url,
        event,
        markText,
        markSeconds,
        timing,
        wind,
        meetName,
        meetDate,
        confidence,
    };
}

export async function POST(req: Request) {
    try {
        // Optional auth guard (uncomment to enforce)
        // const user = await getSessionUser();
        // if (!user) {
        //   return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        // }

        const body = (await req.json().catch(() => ({}))) as In;
        const url = typeof body.url === "string" ? body.url.trim() : "";
        if (!url) {
            return NextResponse.json({ ok: false, error: "Missing URL." }, { status: 400 });
        }
        try {
            new URL(url);
        } catch {
            return NextResponse.json({ ok: false, error: "Invalid URL." }, { status: 400 });
        }

        // 1) Try your real parser(s) here first, e.g.:
        // let raw = await parseAthleticNet(url) or parseMilesplit(url) ...
        // 2) Fallback to parse-debug if available:
        const raw = await tryParseViaDebug(url);

        if (!raw || (raw.ok === false && !raw.data)) {
            // Nothing parseable
            return NextResponse.json({
                ok: false,
                error: "Could not parse this URL. You can still edit and submit manually.",
                source: detectSource(url),
            });
        }

        // Accept both shapes: { ok, data } or raw fields at top-level
        const candidate = raw?.data ?? raw;

        const normalized = normalizePayload(url, candidate);

        // Minimal sanity: at least one meaningful field
        const hasUseful =
            normalized.event ||
            normalized.markText ||
            normalized.markSeconds !== null ||
            normalized.meetName ||
            normalized.meetDate;

        if (!hasUseful) {
            return NextResponse.json({
                ok: false,
                error: "Parser returned no useful fields.",
                source: normalized.source,
            });
        }

        return NextResponse.json({
            ok: true,
            source: normalized.source,
            normalized: {
                event: normalized.event ?? "",
                markText: normalized.markText ?? "",
                markSeconds: normalized.markSeconds ?? null,
                timing: normalized.timing ?? null,
                wind: normalized.wind ?? null,
                meetName: normalized.meetName ?? "",
                meetDate: normalized.meetDate ?? "",
                confidence: normalized.confidence,
            },
        });
    } catch (err: any) {
        return NextResponse.json(
            { ok: false, error: err?.message || "Server error." },
            { status: 500 }
        );
    }
}