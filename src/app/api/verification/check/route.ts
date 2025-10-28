import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchPageContainsNonce } from "@/lib/verification/athleticnet";

export const runtime = "nodejs";

type CheckBody = {
  id?: string;
};

function jsonError(message: string, code: string, status = 400) {
  return NextResponse.json({ error: message, code }, { status });
}

export const POST = async (req: NextRequest) => {
  const user = await getSessionUser();
  if (!user) {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  let body: CheckBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body", "BAD_REQUEST");
  }

  if (!body.id) {
    return jsonError("Missing verification id", "MISSING_ID");
  }

  const admin = createSupabaseAdmin();

  const { data: row, error: fetchErr } = await admin
    .from("external_identities")
    .select("*")
    .eq("id", body.id)
    .maybeSingle();

  if (fetchErr) {
    return jsonError(fetchErr.message, "DB_ERROR", 500);
  }

  if (!row || row.user_id !== user.id) {
    return jsonError("You do not have access to that verification.", "NOT_OWNER", 403);
  }

  if (row.provider !== "athleticnet") {
    return jsonError("Unsupported provider", "UNSUPPORTED_PROVIDER");
  }

  if (!row.nonce) {
    return jsonError("Nonce missing for this verification attempt.", "MISSING_NONCE", 400);
  }

  const hasNonce = await fetchPageContainsNonce(row.profile_url, row.nonce);
  const now = new Date().toISOString();

  if (hasNonce) {
    const { data: updated, error: updateErr } = await admin
      .from("external_identities")
      .update({
        verified: true,
        status: "verified",
        verified_at: now,
        last_checked_at: now,
        error_text: null,
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
        .eq("user_id", user.id)
        .eq("provider", "athleticnet")
        .eq("is_primary", true)
        .limit(1);

      if (!existingPrimary || existingPrimary.length === 0) {
        await admin
          .from("external_identities")
          .update({ is_primary: true })
          .eq("id", updated.id);
        updated.is_primary = true;
      }
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      verified: updated.verified,
      verified_at: updated.verified_at,
      provider: updated.provider,
      profile_url: updated.profile_url,
      external_id: updated.external_id,
      is_primary: updated.is_primary,
    });
  }

  const { data: failedRow, error: failErr } = await admin
    .from("external_identities")
    .update({
      status: "failed",
      verified: false,
      error_text: "Nonce not found",
      attempts: (row.attempts ?? 0) + 1,
      last_checked_at: now,
    })
    .eq("id", row.id)
    .select("id,status,verified,error_text,attempts,last_checked_at")
    .single();

  if (failErr) {
    return jsonError(failErr.message, "DB_ERROR", 500);
  }

  return NextResponse.json({
    id: failedRow.id,
    status: failedRow.status,
    verified: failedRow.verified,
    error: failedRow.error_text,
    attempts: failedRow.attempts,
    last_checked_at: failedRow.last_checked_at,
    code: "NONCE_NOT_FOUND",
  });
};
