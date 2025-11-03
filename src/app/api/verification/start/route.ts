import { NextResponse, NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAppBaseUrl } from "@/lib/env";
import { makeClaimToken } from "@/lib/verification/claimToken";
import { makeNonce, parseAthleticNetExternalId } from "@/lib/verification/athleticnet";
import { parseAthleticNetNumericId } from "@/lib/athleticnet";

export const runtime = "nodejs";

type StartBody = {
  provider?: string;
  profile_url?: string;
  profileUrl?: string;
  athlete_id?: string;
};

function jsonError(message: string, code: string, status = 400) {
  return NextResponse.json({ error: message, code }, { status });
}

export const POST = async (req: NextRequest) => {
  const user = await getSessionUser();
  if (!user) {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  let body: StartBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body", "BAD_REQUEST");
  }

  const provider = body.provider ?? "athleticnet";
  if (provider !== "athleticnet") {
    return jsonError("Unsupported provider", "UNSUPPORTED_PROVIDER");
  }

  const rawProfileUrl = body.profile_url ?? body.profileUrl;
  if (!rawProfileUrl) {
    return jsonError("Missing profile_url", "MISSING_URL");
  }

  let canonicalUrl: string;
  let externalId: string;
  try {
    const parsed = parseAthleticNetExternalId(rawProfileUrl);
    canonicalUrl = parsed.canonicalUrl;
    externalId = parsed.externalId;
  } catch (err: any) {
    return jsonError(err?.message ?? "Invalid Athletic.net URL", "BAD_URL");
  }

  let numericId = (body.athlete_id ?? "").trim();
  if (!numericId) {
    numericId = parseAthleticNetNumericId(rawProfileUrl) ?? "";
  }
  if (!numericId || !/^[0-9]{4,}$/i.test(numericId)) {
    return jsonError("Missing or invalid Athletic.net athlete ID.", "BAD_ATHLETE_ID");
  }

  const admin = createSupabaseAdmin();

  const { data: existing, error: existingErr } = await admin
    .from("external_identities")
    .select("id,user_id,is_primary,verified,status,external_numeric_id")
    .eq("provider", "athleticnet")
    .eq("external_id", externalId)
    .maybeSingle();

  if (existingErr) {
    return jsonError(existingErr.message, "DB_ERROR", 500);
  }

  if (existing && existing.user_id !== user.id && (existing.verified || existing.status === "verified")) {
    return jsonError("That Athletic.net profile is already linked to another account.", "ALREADY_CLAIMED", 409);
  }

  const { data: numericExisting, error: numericErr } = await admin
    .from("external_identities")
    .select("id,user_id,verified,status")
    .eq("provider", "athleticnet")
    .eq("external_numeric_id", numericId)
    .maybeSingle();

  if (numericErr) {
    return jsonError(numericErr.message, "DB_ERROR", 500);
  }

  if (
    numericExisting &&
    numericExisting.user_id !== user.id &&
    (numericExisting.verified || numericExisting.status === "verified")
  ) {
    return jsonError("That Athletic.net profile ID is already linked to another account.", "ALREADY_CLAIMED", 409);
  }

  const nonce = makeNonce();
  const payload = {
    user_id: user.id,
    provider: "athleticnet",
    external_id: externalId,
    external_numeric_id: numericId,
    profile_url: canonicalUrl,
    nonce,
    status: "pending",
    verified: false,
    verified_at: null as string | null,
    error_text: null as string | null,
    attempts: 0,
    last_checked_at: null as string | null,
  };

  type RowData = {
    id: string;
    status: string;
    nonce: string;
    external_id: string;
    external_numeric_id: string | null;
  };
  let row: RowData;

  if (existing?.id) {
    const { data: updated, error: updateErr } = await admin
      .from("external_identities")
      .update(payload)
      .eq("id", existing.id)
      .select("id,status,nonce,external_id,external_numeric_id")
      .single();

    if (updateErr) {
      return jsonError(updateErr.message, "DB_ERROR", 500);
    }

    row = {
      id: updated.id,
      status: updated.status,
      nonce: updated.nonce,
      external_id: updated.external_id,
      external_numeric_id: updated.external_numeric_id,
    };
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from("external_identities")
      .insert(payload)
      .select("id,status,nonce,external_id,external_numeric_id")
      .single();

    if (insertErr) {
      if (insertErr.message.includes("duplicate key value")) {
        return jsonError("That Athletic.net profile is already linked to another account.", "ALREADY_CLAIMED", 409);
      }
      return jsonError(insertErr.message, "DB_ERROR", 500);
    }

    row = {
      id: inserted.id,
      status: inserted.status,
      nonce: inserted.nonce,
      external_id: inserted.external_id,
      external_numeric_id: inserted.external_numeric_id,
    };
  }

  // Generate claim token and store it in the database
  // Use short row ID in URL to avoid truncation issues
  let claimUrl: string;
  try {
    const token = await makeClaimToken({
      row_id: row.id,
      user_id: user.id,
      provider: "athleticnet",
      external_id: row.external_id,
      external_numeric_id: row.external_numeric_id ?? numericId,
      nonce: row.nonce,
    });

    // Store token in database with 24h expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await admin
      .from("external_identities")
      .update({
        claim_token: token,
        claim_token_expires_at: expiresAt,
      })
      .eq("id", row.id);

    // Use short row ID in URL instead of long token
    claimUrl = `${getAppBaseUrl()}/claim/${row.id}`;
  } catch (err: any) {
    return jsonError(err?.message ?? "Failed to generate claim link.", "CLAIM_TOKEN_ERROR", 500);
  }

  const instructions =
    `Recommended: Paste this claim link on your Athletic.net feed while signed in, then tap it to verify instantly:\n${claimUrl}\n\n` +
    `Your athlete ID (keep handy for submissions): ${numericId}\n` +
    `Fallback: Paste this code anywhere visible on your profile and run “Check verification”: ${row.nonce}`;

  return NextResponse.json({
    id: row.id,
    provider: "athleticnet",
    external_id: row.external_id,
    external_numeric_id: row.external_numeric_id ?? numericId,
    profile_url: canonicalUrl,
    nonce: row.nonce,
    status: row.status,
    claim_url: claimUrl,
    instructions,
  });
};
