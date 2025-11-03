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

  // Get ALL verified Athletic.net identities for this user
  const { data: verifiedIdentities } = await supabase
    .from("external_identities")
    .select("external_id, external_numeric_id")
    .eq("user_id", user.id)
    .eq("provider", "athleticnet")
    .eq("verified", true);

  if (!verifiedIdentities || verifiedIdentities.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "No verified Athletic.net profile found. Please verify your Athletic.net account in Settings first."
    }, { status: 400 });
  }

  // Extract athlete slug from parsed result
  const athleteSlug = (parsed as any).athleteSlug as string | undefined;

  // CRITICAL: We MUST extract the athlete ID from the result page
  // Do NOT fall back to the user's verified ID - that would allow submitting any result!
  if (!athleteSlug) {
    return NextResponse.json({
      ok: false,
      error: "Could not determine which athlete this result belongs to. The result page may not contain athlete information."
    }, { status: 400 });
  }

  // CRITICAL: Verify the extracted athlete slug matches one of the user's verified identities
  const athleteSlugLower = athleteSlug.toLowerCase();
  const isVerifiedIdentity = verifiedIdentities.some(
    (id) =>
      id.external_id?.toLowerCase() === athleteSlugLower ||
      id.external_numeric_id === athleteSlug
  );

  if (!isVerifiedIdentity) {
    return NextResponse.json({
      ok: false,
      error: "This result belongs to a different athlete. You can only submit results for your verified Athletic.net profile(s)."
    }, { status: 403 });
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
    // Handle duplicate submission error with friendly message
    if (rpcError.message?.includes("duplicate key") || rpcError.message?.includes("ux_results_athlete_url")) {
      return NextResponse.json({
        ok: false,
        error: "You've already submitted this result. Check your results page to see it."
      }, { status: 409 });
    }
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
