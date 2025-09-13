// src/app/api/proofs/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { isAllowedUrl } from "@/lib/proofs/whitelist";
import { parseBySource } from "@/lib/proofs/parse";
import { normalizeParsed } from "@/lib/proofs/normalize";
import type { ParsedProof, ProofSource } from "@/lib/proofs/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";
import { IS_DEV, PROOF_BYPASS } from "@/lib/flags";

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
    } catch { }
    return { seconds };
}

function serializeError(e: unknown) {
    if (e instanceof Error) return { message: e.message, stack: e.stack };
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

async function userIsAdmin(
    supa: ReturnType<typeof createSupabaseServer>,
    userId: string
) {
    const { data } = await supa
        .from("admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
    return Boolean(data);
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

        const supa = createSupabaseServer();
        const admin = createSupabaseAdmin();

        // ---------- EARLY DUPLICATE CHECKS ----------
        // 1) Current user already submitted this URL?
        const { data: existingUserResult } = await supa
            .from("results")
            .select("id, status, event, mark_seconds, mark_seconds_adj, meet_name, meet_date")
            .eq("athlete_id", user.id)
            .eq("proof_url", url)
            .maybeSingle();

        if (existingUserResult) {
            return NextResponse.json({
                ok: true,
                duplicate: true,
                status: existingUserResult.status,
                resultId: existingUserResult.id,
                event: existingUserResult.event,
                mark_seconds: existingUserResult.mark_seconds,
                mark_seconds_adj: existingUserResult.mark_seconds_adj,
                meet: existingUserResult.meet_name,
                date: existingUserResult.meet_date,
            });
        }

        // 2) Anyone submitted this URL?
        const { data: existingAny } = await admin
            .from("results")
            .select("id")
            .eq("proof_url", url)
            .maybeSingle();

        if (existingAny) {
            return NextResponse.json({
                ok: true,
                duplicate: true,
                message: "This link has already been submitted.",
            });
        }
        // --------------------------------------------

        // Identify provider
        type ProviderRaw = "athleticnet" | "milesplit" | "unknown";
        const host = new URL(url).hostname.toLowerCase();
        const providerRaw: ProviderRaw =
            host.includes("athletic.net") ? "athleticnet" :
                host.includes("milesplit") ? "milesplit" :
                    "unknown";

        if (providerRaw === "unknown") {
            return NextResponse.json({ ok: false, error: "Unsupported source" }, { status: 400 });
        }

        const provider: ProofSource = providerRaw;

        // Athletic.net verification gate (with dev/admin bypass)
        if (provider === "athleticnet") {
            const { data: ext, error: extErr } = await supa
                .from("external_identities")
                .select("*")
                .eq("user_id", user.id)
                .eq("provider", "athleticnet")
                .eq("verified", true)
                .maybeSingle();

            let adminBypass = false;
            try { adminBypass = await userIsAdmin(supa, user.id); } catch { }
            const bypass = PROOF_BYPASS || (IS_DEV && adminBypass);

            if ((!ext || extErr) && !bypass) {
                return NextResponse.json({
                    ok: true,
                    status: "blocked_until_verified",
                    message: "Verify your Athletic.net profile first to auto-validate results.",
                    action: "POST /api/verification/start then /api/verification/check",
                });
            }
        }

        // 1) Parse
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

        // 4) Confidence -> 0..1
        const rawConf =
            (parsed as any)?.confidence ??
            (parsed as any)?.meta?.confidence ??
            (n as any)?.confidence ??
            0;
        const confidence: number =
            typeof rawConf === "number"
                ? rawConf > 1 ? rawConf / 100 : rawConf
                : 0;

        // ---- Dry-run: no DB writes
        if (dryRun) {
            return NextResponse.json({
                ok: true,
                status: confidence >= AUTO_VERIFY_MIN ? "verified" : "pending",
                confidence,
                dryRun: true,
                event: n.event,
                mark_seconds: n.markSeconds,
                mark_seconds_adj: adjSeconds,
                timing: n.timing,
                meet: n.meetName,
                date: n.meetDate,
                source,
                proof_url: url,
            });
        }

        // 5) Insert result with user client (RLS)
        const { data: resultRow, error: rErr } = await supa
            .from("results")
            .insert({
                athlete_id: user.id,
                event: n.event,
                mark: n.markText ?? null,
                mark_seconds: n.markSeconds,
                mark_seconds_adj: adjSeconds,
                mark_metric: null,
                timing: n.timing ?? null,
                wind: n.wind ?? null,
                season: inferSeason(n.meetDate ?? undefined),
                status: confidence >= AUTO_VERIFY_MIN ? "verified" : "pending",
                source,
                proof_url: url,
                meet_name: n.meetName ?? null,
                meet_date: n.meetDate ?? null,
            })
            .select("id, status")
            .single();

        if (rErr) throw rErr;

        // 6) Insert proof with admin client (bypass RLS), enum-safe "pending"
        let proofId: string | null = null;
        try {
            const { data: proofRow, error: pErr } = await admin
                .from("proofs")
                .insert({
                    source,
                    url,
                    status: "pending",     // your enum accepts "pending"
                    confidence,
                    result_id: resultRow.id,
                    // payload: n,          // add column first if you want this
                })
                .select("id")
                .single();
            if (pErr) throw pErr;
            proofId = proofRow?.id ?? null;
        } catch (e: any) {
            // 23505 = unique_violation (idx_proofs_url_hash)
            if (e?.code === "23505") {
                return NextResponse.json({
                    ok: true,
                    duplicate: true,
                    status: resultRow.status,
                    resultId: resultRow.id,
                    event: n.event,
                    mark_seconds: n.markSeconds,
                    mark_seconds_adj: adjSeconds,
                    meet: n.meetName,
                    date: n.meetDate,
                    message: "This link was already submitted.",
                });
            }
            throw e;
        }

        // 7) If auto-verified, refresh rankings MV now
        if (resultRow.status === "verified") {
            try { await admin.rpc("refresh_mv_best_event"); } catch { }
        }

        return NextResponse.json({
            ok: true,
            status: resultRow.status,
            confidence,
            proofId,
            resultId: resultRow.id,
            event: n.event,
            mark_seconds: n.markSeconds,
            mark_seconds_adj: adjSeconds,
            timing: n.timing,
            meet: n.meetName,
            date: n.meetDate,
        });
    } catch (e: unknown) {
        const err = serializeError(e);
        return NextResponse.json({ ok: false, error: err }, { status: 400 });
    }
}
