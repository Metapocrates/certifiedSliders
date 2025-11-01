import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/compat";
import {
  safeFetchHtml,
  parseAthleticNetSlug,
  parseAthleticNetResultId,
  parseAthleticNetNumericId,
  extractSlugFromHtml,
  extractNumericIdFromHtml,
  extractCanonicalProfileUrl,
} from "@/lib/athleticnet";
import { parseBySource } from "@/lib/proofs/parse";

export const runtime = "nodejs";

const BodySchema = z.object({
  profile_url: z.string().url(),
  result_url: z.string().url(),
  context_url: z.string().url().optional(),
});

function jsonError(message: string, code: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

function containsResultId(html: string, resultId: string) {
  const normalized = html.toLowerCase();
  return normalized.includes(`/result/${resultId.toLowerCase()}`) || normalized.includes(resultId.toLowerCase());
}

function hashSnapshot(html: string) {
  const normalized = html.replace(/\s+/g, " ").slice(0, 20000);
  return createHash("sha256").update(normalized).digest("hex");
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  let payload: z.infer<typeof BodySchema>;
  try {
    const json = await req.json();
    payload = BodySchema.parse(json);
  } catch {
    return jsonError("Invalid request body", "BAD_REQUEST");
  }

  let slug: string;
  let numericCandidate: string | null = parseAthleticNetNumericId(payload.profile_url);
  try {
    slug = parseAthleticNetSlug(payload.profile_url);
  } catch (err: any) {
    return jsonError(err?.message ?? "Invalid profile URL", "BAD_PROFILE_URL");
  }

  let resultId: string;
  try {
    resultId = parseAthleticNetResultId(payload.result_url);
  } catch (err: any) {
    return jsonError(err?.message ?? "Invalid result URL", "BAD_RESULT_URL");
  }

  const { data: identities, error: idErr } = await supabase
    .from("external_identities")
    .select("external_id, external_numeric_id")
    .eq("user_id", user.id)
    .eq("provider", "athleticnet")
    .eq("verified", true);
  if (idErr) {
    return jsonError(idErr.message, "DB_ERROR", 500);
  }
  const verifiedIdentities = (identities ?? [])
    .map((row) => ({
      slug: row.external_id ?? "",
      slugLower: (row.external_id ?? "").toLowerCase(),
      numeric: row.external_numeric_id ?? null,
    }))
    .filter((record) => record.slug);

  if (!verifiedIdentities.length) {
    return jsonError("You need a verified Athletic.net profile before submitting results.", "PROFILE_NOT_VERIFIED", 403);
  }

  let primaryHtml: string;
  let finalProfileUrl: string;
  try {
    const { html, finalUrl } = await safeFetchHtml(payload.profile_url);
    primaryHtml = html;
    finalProfileUrl = finalUrl;
  } catch (err: any) {
    return jsonError(err?.message ?? "Unable to load profile page.", "PROFILE_FETCH_FAILED", 400);
  }

  const setSlug = (candidate: string) => {
    slug = candidate;
  };
  const setNumeric = (candidate: string | null) => {
    if (candidate && candidate.length) {
      numericCandidate = candidate;
    }
  };

  // Try final URL after redirects
  try {
    if (finalProfileUrl && finalProfileUrl !== payload.profile_url) {
      const redirectedSlug = parseAthleticNetSlug(finalProfileUrl);
      setSlug(redirectedSlug);
      setNumeric(parseAthleticNetNumericId(finalProfileUrl));
    }
  } catch {
    // ignore
  }

  // Try canonical link
  const canonicalUrl = extractCanonicalProfileUrl(primaryHtml);
  if (canonicalUrl) {
    try {
      const canonicalSlug = parseAthleticNetSlug(canonicalUrl);
      setSlug(canonicalSlug);
    } catch {
      // ignore
    }
    setNumeric(parseAthleticNetNumericId(canonicalUrl));
  }

  // Try slug references in HTML body
  const slugFromHtml = extractSlugFromHtml(primaryHtml);
  if (slugFromHtml) {
    setSlug(slugFromHtml);
  }

  setNumeric(extractNumericIdFromHtml(primaryHtml));

  let slugLower = slug.toLowerCase();

  const matchedIdentity =
    verifiedIdentities.find((record) => record.slugLower === slugLower) ||
    (numericCandidate ? verifiedIdentities.find((record) => record.numeric === numericCandidate) : undefined);

  if (!matchedIdentity) {
    return jsonError("That Athletic.net profile is not verified for this account.", "PROFILE_NOT_VERIFIED", 403);
  }

  slug = matchedIdentity.slug;
  slugLower = slug.toLowerCase();
  const matchedNumeric = matchedIdentity.numeric ?? numericCandidate;

  if (!matchedIdentity.numeric && matchedNumeric) {
    await supabase
      .from("external_identities")
      .update({ external_numeric_id: matchedNumeric })
      .eq("user_id", user.id)
      .eq("provider", "athleticnet")
      .eq("external_id", matchedIdentity.slug)
      .throwOnError();
  }

  let matched = containsResultId(primaryHtml, resultId);
  if (!matched && payload.context_url) {
    try {
      const { html } = await safeFetchHtml(payload.context_url);
      matched = containsResultId(html, resultId);
    } catch {
      // ignore context fetch failures
    }
  }

  if (!matched) {
    return jsonError("Result link not found on the provided profile page.", "RESULT_NOT_FOUND", 400);
  }

  let parsedProof: any;
  try {
    const { parsed } = await parseBySource(payload.result_url);
    parsedProof = parsed;
  } catch (err: any) {
    return jsonError(err?.message ?? "Failed to parse result page.", "PARSE_FAILED", 400);
  }

  const markSeconds =
    typeof parsedProof.markSeconds === "number" && Number.isFinite(parsedProof.markSeconds)
      ? parsedProof.markSeconds
      : null;
  const markMetric = parsedProof.markMetric ?? null;
  if (!markSeconds && !markMetric) {
    return jsonError("Result page did not include a recognizable mark.", "MARK_MISSING", 400);
  }

  const timing = parsedProof.timing ?? null;
  const windValue = typeof parsedProof.wind === "number" ? parsedProof.wind : null;
  const meetDate = parsedProof.meetDate ? new Date(parsedProof.meetDate) : null;
  const isoMeetDate = meetDate && !Number.isNaN(meetDate.getTime()) ? meetDate.toISOString() : null;
  const eventName = parsedProof.event ?? "";
  const meetName = parsedProof.meetName ?? null;
  const markText = parsedProof.markText ?? (markSeconds ? markSeconds.toString() : null);
  const confidence = parsedProof.confidence ?? 0;

  const { data: token, error: tokenError } = await supabase.rpc("mint_proof_token", {
    p_scope: "athleticnet_result_claim",
  });
  if (tokenError || !token) {
    return jsonError(tokenError?.message ?? "Failed to authenticate result insertion.", "TOKEN_FAILED", 500);
  }

  const { data: adjusted } = markSeconds
    ? await supabase.rpc("adjust_time", {
        p_event: eventName,
        p_seconds: markSeconds,
        p_timing: timing,
      })
    : { data: null };
  const markSecondsAdj = (adjusted as any)?.seconds ?? markSeconds;

  const { error: rpcError, data: resultIdInserted } = await supabase.rpc("verify_and_insert_result", {
    p_token: token,
    p_source: "athleticnet",
    p_source_url: payload.result_url,
    p_source_athlete_id: slug,
    p_event: eventName,
    p_mark_text: markText ?? "",
    p_mark_seconds: markSeconds,
    p_mark_metric: markMetric ?? null,
    p_timing: timing,
    p_wind: windValue,
    p_season: parsedProof.season ?? null,
    p_meet_date: isoMeetDate,
    p_meet_name: meetName,
    p_confidence: confidence,
  });

  if (rpcError) {
    return jsonError(rpcError.message, "RESULT_INSERT_FAILED", 400);
  }

  const snapshotHash = hashSnapshot(primaryHtml);
  await supabase
    .from("results_submissions")
    .insert({
      user_id: user.id,
      provider: "athleticnet",
      external_id: slug,
      mode: "two_link",
      status: "accepted",
      profile_url: payload.profile_url,
      result_url: payload.result_url,
      context_url: payload.context_url ?? null,
      page_snapshot_hash: snapshotHash,
      payload: {
        event: eventName,
        markSeconds,
        markSecondsAdj,
        markMetric,
        timing,
        wind: windValue,
        meetName,
        meetDate: isoMeetDate,
        resultId: resultIdInserted,
        proofConfidence: confidence,
        athleteNumericId: matchedNumeric,
      },
      decided_at: new Date().toISOString(),
    })
    .throwOnError();

  return NextResponse.json({
    ok: true,
    status: "accepted",
    resultId: resultIdInserted,
  });
}
