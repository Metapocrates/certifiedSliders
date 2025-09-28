// src/app/api/proofs/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";

let isAllowedUrl: ((url: string) => boolean) | null = null;
let parseBySource:
    | ((url: string) => Promise<{ source: "athleticnet" | "milesplit" | "other"; parsed: any }>)
    | null = null;
let normalizeParsed: ((input: any) => any) | null = null;

try {
    // Adjust these import paths if your files live elsewhere
    // @ts-ignore
    isAllowedUrl = (await import("@/lib/proofs/whitelist")).isAllowedUrl;
    // @ts-ignore
    parseBySource = (await import("@/lib/proofs/parse")).parseBySource;
    // @ts-ignore
    normalizeParsed = (await import("@/lib/proofs/normalize")).normalizeParsed;
} catch {
    // Intentionally swallow; we’ll surface a helpful error below.
}

export const runtime = "nodejs";

function json(data: any, init?: ResponseInit) {
    return NextResponse.json(data, init);
}

function detectSource(u: URL): "athleticnet" | "milesplit" | "other" {
    const host = u.hostname.toLowerCase();
    if (host.includes("athletic.net")) return "athleticnet";
    if (host.includes("milesplit")) return "milesplit";
    return "other";
}

export async function POST(req: NextRequest) {
    try {
        const supabase = createSupabaseServer();
        const user = await getSessionUser();
        if (!user) return json({ ok: false, error: "Unauthorized" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const url: string | undefined = body?.url;
        if (!url) return json({ ok: false, error: "Missing 'url' in body" }, { status: 400 });

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return json({ ok: false, error: "Invalid URL" }, { status: 400 });
        }

        const PROOF_BYPASS = process.env.PROOF_BYPASS === "1";

        if (!PROOF_BYPASS && isAllowedUrl && !isAllowedUrl(url)) {
            return json(
                { ok: false, error: "URL domain is not allowed. Use Athletic.net or MileSplit." },
                { status: 400 }
            );
        }

        const source = detectSource(parsedUrl);

        if (!parseBySource || !normalizeParsed) {
            return json(
                {
                    ok: false,
                    error:
                        "Parser modules not found. Ensure '@/lib/proofs/parse' and '@/lib/proofs/normalize' exist and export the expected functions.",
                },
                { status: 500 }
            );
        }

        const parsedResult = await parseBySource(url).catch((e: any) => ({
            parsed: null as any,
            __err: e?.message || "Parser failed unexpectedly.",
        }));

        const { parsed } = parsedResult;
        if (!parsed) {
            return json(
                {
                    ok: false,
                    error:
                        "Could not parse this URL (step: parseBySource). Ensure the page is public and is a direct result page.",
                    source,
                },
                { status: 422 }
            );
        }

        let normalized: any = null;
        try {
            normalized = normalizeParsed!(parsed);
        } catch {
            normalized = null;
        }

        if (!normalized) {
            return json(
                {
                    ok: false,
                    error:
                        "Parsed data did not normalize (step: normalizeParsed). The page structure may have changed.",
                    source,
                    parsed,
                },
                { status: 422 }
            );
        }

        const required = ["event", "markText", "markSeconds", "timing", "wind", "meetName", "meetDate"];
        const missing = required.filter((k) => !(k in normalized));
        if (missing.length) {
            return json(
                {
                    ok: false,
                    error: `Normalized object missing fields: ${missing.join(", ")}`,
                    source,
                    normalized,
                },
                { status: 422 }
            );
        }

        return json({ ok: true, source, parsed, normalized }, { status: 200 });
    } catch (e: any) {
        return json(
            { ok: false, error: e?.message || "Unexpected server error in ingest." },
            { status: 500 }
        );
    }
}
