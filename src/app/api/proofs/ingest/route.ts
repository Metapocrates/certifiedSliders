// src/app/api/proofs/ingest/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

type Timing = "FAT" | "Hand" | null;

type Parsed = {
    event: string;
    markText: string;
    markSeconds: number | null;
    timing: Timing;
    wind: number | null;
    meetName: string;
    meetDate: string; // YYYY-MM-DD
    confidence?: number;
};

type IngestResponse = {
    ok: boolean;
    error?: string;
    source?: "athleticnet" | "milesplit" | "other";
    parsed?: Parsed | null;
    normalized?: Parsed | null;
};

function classifySource(u: string): "athleticnet" | "milesplit" | "other" {
    try {
        const host = new URL(u).hostname.replace(/^www\./, "");
        if (host.includes("athletic.net")) return "athleticnet";
        if (host.includes("milesplit")) return "milesplit";
        return "other";
    } catch {
        return "other";
    }
}

function pick<T = any>(obj: any, ...keys: string[]): T | null {
    if (!obj || typeof obj !== "object") return null;
    for (const k of keys) {
        if (obj[k] != null) return obj[k];
    }
    return null;
}

// Try to coerce arbitrary verifier shapes into our Parsed shape
function coerceToParsed(raw: any): Parsed | null {
    if (!raw || typeof raw !== "object") return null;

    // Look for nested normalized/parsed first
    const nested = raw.normalized ?? raw.parsed ?? null;
    const base = nested || raw; // fall back to top-level

    // Accept both snake_case and camelCase
    const event = pick<string>(base, "event");
    const markText = pick<string>(base, "markText", "mark_text", "mark");
    const markSeconds = pick<number>(base, "markSeconds", "mark_seconds", "time_seconds");
    const timing = pick<string>(base, "timing") as Timing | null;
    const wind = pick<number>(base, "wind", "wind_ms");
    const meetName = pick<string>(base, "meetName", "meet_name");
    const meetDate = pick<string>(base, "meetDate", "meet_date");
    const confidence = pick<number>(base, "confidence");

    // Minimal required fields: event + something for mark
    if (!event) return null;
    if (!markText && (markSeconds == null)) return null;

    return {
        event,
        markText: markText ?? "",
        markSeconds: markSeconds == null ? null : Number(markSeconds),
        timing: timing === "FAT" || timing === "Hand" ? (timing as Timing) : null,
        wind: wind == null ? null : Number(wind),
        meetName: meetName ?? "",
        meetDate: meetDate ?? "",
        confidence: confidence == null ? undefined : Number(confidence),
    };
}

async function tryInternalVerify(url: string): Promise<Partial<IngestResponse> | null> {
    const base =
        process.env.NEXT_PUBLIC_SUPABASE_SITE_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "http://localhost:3000";

    const endpoints = ["/api/proofs/verify", "/api/proofs/parse-debug"];

    for (const ep of endpoints) {
        try {
            const res = await fetch(new URL(ep, base).toString(), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ url }),
            });
            if (!res.ok) continue;

            const data = await res.json().catch(() => null);
            if (!data) continue;

            const normalized = coerceToParsed(data);
            if (normalized) {
                return {
                    ok: true,
                    source: data.source as IngestResponse["source"] | undefined,
                    parsed: null,
                    normalized,
                };
            }

            // If endpoint explicitly says ok and already matches our shape
            if (data.ok && (data.normalized || data.parsed)) {
                return {
                    ok: true,
                    source: data.source as IngestResponse["source"] | undefined,
                    parsed: data.parsed ?? null,
                    normalized: data.normalized ?? null,
                };
            }
        } catch {
            // try next endpoint
        }
    }

    return null;
}

export async function POST(req: NextRequest) {
    const supabase = createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json<IngestResponse>(
            { ok: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    let url: string | undefined;
    try {
        const ct = req.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
            const body = (await req.json()) as { url?: string };
            url = body?.url;
        } else {
            const form = await req.formData();
            url = (form.get("url") as string) || undefined;
        }
    } catch {
        // ignore
    }

    if (!url) {
        return NextResponse.json<IngestResponse>(
            { ok: false, error: "Missing URL" },
            { status: 400 }
        );
    }

    const source = classifySource(url);

    // 1) Try internal verifiers and coerce output to our Parsed shape
    const verified = await tryInternalVerify(url);
    if (verified?.ok) {
        return NextResponse.json<IngestResponse>({
            ok: true,
            source: verified.source ?? source,
            parsed: verified.parsed ?? null,
            normalized: verified.normalized ?? null,
        });
    }

    // 2) Graceful fallback: let UI switch to manual edit
    return NextResponse.json<IngestResponse>({
        ok: true,
        source,
        parsed: null,
        normalized: null,
    });
}
