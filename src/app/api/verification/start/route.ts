import { NextResponse, NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { makeNonce, parseAthleticNetExternalId } from "@/lib/verification/athleticnet";

export const runtime = "nodejs";

type StartBody = {
  provider?: string;
  profile_url?: string;
  profileUrl?: string;
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

  const admin = createSupabaseAdmin();

  const { data: existing, error: existingErr } = await admin
    .from("external_identities")
    .select("id,user_id,is_primary,verified")
    .eq("provider", "athleticnet")
    .eq("external_id", externalId)
    .maybeSingle();

  if (existingErr) {
    return jsonError(existingErr.message, "DB_ERROR", 500);
  }

  if (existing && existing.user_id !== user.id) {
    return jsonError("That Athletic.net profile is already linked to another account.", "ALREADY_CLAIMED", 409);
  }

  const nonce = makeNonce();
  const payload = {
    user_id: user.id,
    provider: "athleticnet",
    external_id: externalId,
    profile_url: canonicalUrl,
    nonce,
    status: "pending",
    verified: false,
    verified_at: null as string | null,
    error_text: null as string | null,
    attempts: 0,
    last_checked_at: null as string | null,
  };

  let rowId: string;
  let status = "pending";

  if (existing?.id) {
    const { data: updated, error: updateErr } = await admin
      .from("external_identities")
      .update(payload)
      .eq("id", existing.id)
      .select("id,status")
      .single();

    if (updateErr) {
      return jsonError(updateErr.message, "DB_ERROR", 500);
    }

    rowId = updated.id;
    status = updated.status;
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from("external_identities")
      .insert(payload)
      .select("id,status")
      .single();

    if (insertErr) {
      if (insertErr.message.includes("duplicate key value")) {
        return jsonError("That Athletic.net profile is already linked to another account.", "ALREADY_CLAIMED", 409);
      }
      return jsonError(insertErr.message, "DB_ERROR", 500);
    }

    rowId = inserted.id;
    status = inserted.status;
  }

  const instructions =
    `Add this code anywhere visible on your Athletic.net profile (About section, feed post, etc.): ${nonce}\n` +
    `Make sure it is public, then click “Check verification”.`;

  return NextResponse.json({
    id: rowId,
    provider: "athleticnet",
    external_id: externalId,
    profile_url: canonicalUrl,
    nonce,
    status,
    instructions,
  });
};
