// src/app/api/proofs/parse-debug/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parseBySource } from "@/lib/proofs/parse";
import { normalizeParsed } from "@/lib/proofs/normalize";
import type { ParsedProof, ProofSource } from "@/lib/proofs/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Disabled in production" }, { status: 404 });
    }

    // Optional simple guard for local/dev
    const devKey = req.headers.get("x-dev-key");
    if (!devKey || devKey !== process.env.DEV_DEBUG_KEY) {
        return NextResponse.json({ error: "Unauthorized (missing x-dev-key)" }, { status: 401 });
    }

    try {
        const body = (await req.json()) as { url: string };
        const { url } = body;

        if (!url) {
            return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
        }

        // Your parseBySource currently accepts only (url)
        const { source, parsed } = (await parseBySource(url)) as {
            source: ProofSource;
            parsed: ParsedProof;
        };

        const n = normalizeParsed(parsed);

        // Normalize confidence to 0–1; support 0–100 fallback; default 0
        const rawConf =
            (parsed as any)?.confidence ??
            (parsed as any)?.meta?.confidence ??
            (n as any)?.confidence ??
            0;

        const confidence =
            typeof rawConf === "number" ? (rawConf > 1 ? rawConf / 100 : rawConf) : 0;

        return NextResponse.json({
            ok: true,
            source,
            parsed, // raw parser output
            normalized: {
                ...n,
                confidence,
            },
        });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message ?? String(e) },
            { status: 400 }
        );
    }
}
