import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBySource } from "@/lib/proofs/parse";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const runtime = "nodejs";

const BodySchema = z.object({
  url: z.string().url(),
});

function deriveSeason(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return "OUTDOOR";
  const month = date.getUTCMonth(); // 0-11
  // Indoor roughly Nov-Feb (agree adjust if needed)
  if (month <= 1 || month === 10 || month === 11) return "INDOOR";
  return "OUTDOOR";
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const body = BodySchema.safeParse(json);
  if (!body.success) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const supabase = createSupabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const { url } = body.data;
  let parsed;
  try {
    const { source, parsed: proof } = await parseBySource(url);
    if (source !== "athleticnet") {
      return NextResponse.json({ ok: false, error: "unsupported_source" }, { status: 400 });
    }
    parsed = proof;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "parse_failed" }, { status: 400 });
  }

  const athleteSlug = (parsed as any).athleteSlug as string | undefined;
  if (!athleteSlug) {
    return NextResponse.json({ ok: false, error: "athlete_id_missing" }, { status: 400 });
  }

  const markSeconds = typeof parsed.markSeconds === "number" && Number.isFinite(parsed.markSeconds)
    ? parsed.markSeconds
    : null;
  const markMetric = (parsed as any).markMetric as number | null | undefined;
  if (!markSeconds && !markMetric) {
    return NextResponse.json({ ok: false, error: "mark_missing" }, { status: 400 });
  }

  const meetDate = parsed.meetDate ? new Date(parsed.meetDate) : null;
  const isoMeetDate = meetDate && !Number.isNaN(meetDate.getTime()) ? meetDate.toISOString() : null;
  const season = deriveSeason(meetDate);

  const timing = parsed.timing ?? null;
  const windValue = typeof parsed.wind === "number" ? parsed.wind : null;

  const { data: token, error: tokenError } = await supabase.rpc("mint_proof_token", {
    p_scope: "athleticnet_result_claim",
  });
  if (tokenError || !token) {
    return NextResponse.json({ ok: false, error: tokenError?.message || "token_failed" }, { status: 400 });
  }

  const { data: adjusted } = markSeconds
    ? await supabase.rpc("adjust_time", {
        p_event: parsed.event,
        p_seconds: markSeconds,
        p_timing: timing,
      })
    : { data: null };
  const markSecondsAdj = (adjusted as any)?.seconds ?? markSeconds;

  const { error: rpcError, data: resultId } = await supabase.rpc("verify_and_insert_result", {
    p_token: token,
    p_source: "athleticnet",
    p_source_url: url,
    p_source_athlete_id: athleteSlug,
    p_event: parsed.event ?? "",
    p_mark_text: parsed.markText ?? (markSeconds ? markSeconds.toString() : ""),
    p_mark_seconds: markSeconds,
    p_mark_metric: markMetric ?? null,
    p_timing: timing,
    p_wind: windValue,
    p_season: season,
    p_meet_date: isoMeetDate,
    p_meet_name: parsed.meetName ?? null,
    p_confidence: (parsed as any)?.confidence ?? 0,
  });

  if (rpcError) {
    return NextResponse.json({ ok: false, error: rpcError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    resultId,
    parsed: {
      event: parsed.event,
      markText: parsed.markText,
      markSeconds,
      markSecondsAdj,
      timing,
      wind: windValue,
      meetName: parsed.meetName,
      meetDate: isoMeetDate,
      season,
    },
  });
}
