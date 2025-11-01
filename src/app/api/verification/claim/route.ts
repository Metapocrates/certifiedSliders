import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { makeNonce } from "@/lib/verification/athleticnet";
import { verifyClaimToken } from "@/lib/verification/claimToken";

export const runtime = "nodejs";

function jsonError(message: string, code: string, status = 400) {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

async function extractToken(req: NextRequest): Promise<string | null> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("application/json")) {
    try {
      const body = await req.json();
      return typeof body?.token === "string" ? body.token : null;
    } catch {
      return null;
    }
  }

  if (contentType.toLowerCase().includes("application/x-www-form-urlencoded") || contentType.toLowerCase().includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      const value = form.get("token");
      return typeof value === "string" ? value : null;
    } catch {
      return null;
    }
  }

  // Try JSON as fallback even if header missing
  try {
    const body = await req.json();
    return typeof body?.token === "string" ? body.token : null;
  } catch {
    return null;
  }
}

export const POST = async (req: NextRequest) => {
  const token = await extractToken(req);
  if (!token) {
    return jsonError("Missing claim token.", "MISSING_TOKEN");
  }

  // Debug: log what we received
  console.log('[claim] Received token length:', token.length);
  console.log('[claim] Received token:', token);
  console.log('[claim] Dots in token:', (token.match(/\./g) || []).length);

  let payload;
  try {
    // Token arrives already decoded by Next.js from path params; no need to decode again
    payload = await verifyClaimToken(token);
  } catch (err: any) {
    return jsonError(err?.message ?? "Invalid or expired claim token.", "BAD_TOKEN", 400);
  }

  const admin = createSupabaseAdmin();
  const { data: row, error } = await admin
    .from("external_identities")
    .select("*")
    .eq("id", payload.row_id)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, "DB_ERROR", 500);
  }

  if (!row) {
    return jsonError("Verification entry not found.", "NOT_FOUND", 404);
  }

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

  if (row.verified) {
    return NextResponse.json({ ok: true, already: true });
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
