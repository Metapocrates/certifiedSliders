import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { makeNonce } from "@/lib/verification/athleticnet";
import { verifyClaimToken } from "@/lib/verification/claimToken";

export const runtime = "nodejs";

function jsonError(message: string, code: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

async function extractRowId(req: NextRequest): Promise<string | null> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.toLowerCase().includes("application/json")) {
    try {
      const body = await req.json();
      return typeof body?.row_id === "string" ? body.row_id : null;
    } catch {
      return null;
    }
  }

  if (contentType.toLowerCase().includes("application/x-www-form-urlencoded") || contentType.toLowerCase().includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      const value = form.get("row_id");
      return typeof value === "string" ? value : null;
    } catch {
      return null;
    }
  }

  // Try JSON as fallback even if header missing
  try {
    const body = await req.json();
    return typeof body?.row_id === "string" ? body.row_id : null;
  } catch {
    return null;
  }
}

export const POST = async (req: NextRequest) => {
  const rowId = await extractRowId(req);
  if (!rowId) {
    return jsonError("Missing row ID.", "MISSING_ROW_ID");
  }

  const admin = createSupabaseAdmin();

  // Fetch the row and its stored claim token
  const { data: row, error } = await admin
    .from("external_identities")
    .select("*")
    .eq("id", rowId)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, "DB_ERROR", 500);
  }

  if (!row) {
    return jsonError("Verification entry not found.", "NOT_FOUND", 404);
  }

  // Check if already verified first (before checking token)
  if (row.verified) {
    return NextResponse.json({ ok: true, already: true });
  }

  if (!row.claim_token) {
    return jsonError("No claim token found for this verification.", "NO_TOKEN", 400);
  }

  if (row.claim_token_expires_at && new Date(row.claim_token_expires_at) < new Date()) {
    return jsonError("Claim link has expired. Generate a new one from Settings.", "TOKEN_EXPIRED", 410);
  }

  // Verify the stored claim token
  let payload;
  try {
    payload = await verifyClaimToken(row.claim_token);
  } catch (err: any) {
    return jsonError(err?.message ?? "Invalid or expired claim token.", "BAD_TOKEN", 400);
  }

  // Validate that the token matches the row
  const tokenNumericId = payload.external_numeric_id ?? null;
  if (
    row.user_id !== payload.user_id ||
    row.provider !== payload.provider ||
    row.external_id !== payload.external_id ||
    row.nonce !== payload.nonce ||
    (row.external_numeric_id && tokenNumericId && row.external_numeric_id !== tokenNumericId)
  ) {
    return jsonError("Claim token no longer matches this verification.", "TOKEN_MISMATCH", 409);
  }

  const referer = req.headers.get("referer");
  const now = new Date().toISOString();
  const newNonce = makeNonce();
  const numericToPersist = tokenNumericId ?? row.external_numeric_id ?? null;

  const { data: updated, error: updateErr } = await admin
    .from("external_identities")
    .update({
      status: "verified",
      verified: true,
      verified_at: now,
      last_checked_at: now,
      nonce: newNonce,
      external_numeric_id: numericToPersist,
      error_text: referer ? `claimed_via_link (${referer})` : "claimed_via_link",
      claim_token: null, // Clear token after use for security
      claim_token_expires_at: null,
    })
    .eq("id", row.id)
    .select("*")
    .single();

  if (updateErr) {
    return jsonError(updateErr.message, "DB_ERROR", 500);
  }

  if (!updated.is_primary) {
    const { data: existingPrimary } = await admin
      .from("external_identities")
      .select("id")
      .eq("user_id", updated.user_id)
      .eq("provider", "athleticnet")
      .eq("is_primary", true)
      .limit(1);

    if (!existingPrimary || existingPrimary.length === 0) {
      await admin
        .from("external_identities")
        .update({ is_primary: true })
        .eq("id", updated.id);
    }
  }

  return NextResponse.json({ ok: true });
};
