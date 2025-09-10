// src/app/api/proofs/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { isAllowedUrl } from "@/lib/proofs/whitelist";
import { parseBySource } from "@/lib/proofs/parse";
import { normalizeParsed } from "@/lib/proofs/normalize";
import type { ParsedProof, ProofSource } from "@/lib/proofs/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
const AUTO_VERIFY_MIN = 0.85 as const;

// ----------------- helpers -----------------
async function adjustTime(
    event: string,
    seconds: number,
    timing: "FAT" | "hand" | null
): Promise<{ seconds: number }> {
    try {
        const admin = createSupabaseAdmin();
        const { data, error } = await admin.rpc("adjust_time", {
            p_event: event,
            p_seconds: seconds,
            p_timing: timing, // null allowed
        });
        if (!error && data && typeof (data as any).seconds === "number") {
            return data as { seconds: number };
        }
        // fallthrough to passthrough on RPC errors
    } catch { }
    return { seconds };
}

// Serialize any thrown value into a readable string + extra fields (if present)
function serializeError(e: unknown) {
    if (e instanceof Error) {
        return { message: e.message, stack: e.stack };
    }
    if (typeof e === "string") return { message: e };
    if (e && typeof e === "object") {
        const pg = e as Record<string, any>;
        return {
            message: pg.message ?? JSON.stringify(e),
            code: pg.code,
            details: pg.details ?? pg.detail,
            hint: pg.hint,
            status: pg.status,
        };
    }
    return { message: String(e) };
}

function inferSeason(iso?: string): "INDOOR" | "OUTDOOR" {
    if (!iso) return "OUTDOOR";
    const m = Number(iso.slice(5, 7));
    return m === 12 || m <= 3 ? "INDOOR" : "OUTDOOR";
}

// ----------------- main handler -----------------
export async function POST(req: NextRequest) {
    const urlObj = new URL(req.url);
    const dryRun = urlObj.searchParams.get("dry") === "1";

    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await req.json()) as { url: string; html?: string };
        const { url } = body;

        if (!url || !isAllowedUrl(url)) {
            return NextResponse.json(
                { ok: false, error: "Unsupported or missing URL" },
                { status: 400 }
            );
        }

        // Identify provider by URL (raw can be 'unknown' without touching your ProofSource)
        type ProviderRaw = "athleticnet" | "milesplit" | "unknown";
        const host = new URL(url).hostname.toLowerCase();
        const providerRaw: ProviderRaw =
            host.includes("athletic.net") ? "athleticnet" :
                host.includes("milesplit") ? "milesplit" :
                    "unknown";

        if (providerRaw === "unknown") {
            return NextResponse.json({ ok: false, error: "Unsupported source" }, { status: 400 });
        }

        // Now narrow to your app’s ProofSource type
        const provider: ProofSource = providerRaw;

        // RLS-aware client (acts as the signed-in user)
        const supa = createSupabaseServer();

        // If Athletic.net, require pre-verification via external_identities
        if (provider === "athleticnet") {
            const { data: ext, error: extErr } = await supa
                .from("external_identities")
                .select("*")
                .eq("user_id", user.id)
                .eq("provider", "athleticnet")
                .eq("verified", true)
                .single();

            if (!ext || extErr) {
                return NextResponse.json({
                    ok: true,
                    status: "blocked_until_verified",
                    message: "Verify your Athletic.net profile first to auto-validate results.",
                    action: "POST /api/verification/start then /api/verification/check",
                });
            }
        }

        // 1) Parse -> { source, parsed }
        const { source, parsed } = (await parseBySource(url)) as {
            source: ProofSource;
            parsed: ParsedProof;
        };

        // 2) Normalize
        const n = normalizeParsed(parsed);

        // 3) Adjust time
        const { seconds: adjSeconds } = await adjustTime(
            n.event,
            n.markSeconds,
            n.timing ?? null
        );

        // 4) Confidence (normalize to 0–1; support 0–100 incoming; fallback 0)
        const rawConf =
            (parsed as any)?.confidence ??
            (parsed as any)?.meta?.confidence ??
            (n as any)?.confidence ??
            0;
        const confidence: number =
            typeof rawConf === "number"
                ? rawConf > 1
                    ? rawConf / 100
                    : rawConf
                : 0;

        // ---- Dry-run mode: no DB writes
        if (dryRun) {
            return NextResponse.json({
                ok: true,
                status: confidence >= AUTO_VERIFY_MIN ? "verified" : "pending",
                confidence,
                dryRun: true,
                event: n.event,
                mark_seconds: n.markSeconds,
                timing: n.timing,
                mark_seconds_adj: adjSeconds,
                meet: n.meetName,
                date: n.meetDate,
                source,
                proof_url: url,
            });
        }

        // 5) Insert result using RLS client (athlete_id must equal auth.uid())
        const { data: resultRow, error: rErr } = await supa
            .from("results")
            .insert({
                athlete_id: user.id,                     // <<< never null
                event: n.event,
                mark: n.markText ?? null,                // raw for audit
                mark_seconds: n.markSeconds,
                mark_seconds_adj: adjSeconds,
                mark_metric: null,
                timing: n.timing ?? null,
                wind: n.wind ?? null,
                season: inferSeason(n.meetDate ?? undefined),
                status: confidence >= AUTO_VERIFY_MIN ? "verified" : "pending",
                source: source,                          // from parser
                proof_url: url,
                meet_name: n.meetName ?? null,
                meet_date: n.meetDate ?? null,
            })
            .select("id, status")
            .single();

        if (rErr) throw rErr;

        // 6) Insert proof log (via RLS; if your proofs table is admin-only, swap to admin client)
        const { data: proofRow, error: pErr } = await supa
            .from("proofs")
            .insert({
                source: source,
                url,
                status: confidence >= AUTO_VERIFY_MIN ? "verified" : "pending",
                confidence,                              // 0–1
                result_id: resultRow.id,
                payload: n,                              // JSON for audit/debug
            })
            .select("id")
            .single();

        if (pErr) throw pErr;

        return NextResponse.json({
            ok: true,
            status: resultRow.status,
            confidence,
            proofId: proofRow.id,
            resultId: resultRow.id,
            event: n.event,
            mark_seconds: n.markSeconds,
            timing: n.timing,
            meet: n.meetName,
            date: n.meetDate,
        });
    } catch (e: unknown) {
        const err = serializeError(e);
        return NextResponse.json({ ok: false, error: err }, { status: 400 });
    }
}
