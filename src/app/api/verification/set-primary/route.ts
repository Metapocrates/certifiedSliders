import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SetPrimaryBody = {
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

  let body: SetPrimaryBody;
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
    .select("id,user_id,provider,verified,is_primary")
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

  if (!row.verified) {
    return jsonError("Only verified profiles can be set as primary.", "NOT_VERIFIED", 400);
  }

  await admin
    .from("external_identities")
    .update({ is_primary: false })
    .eq("user_id", user.id)
    .eq("provider", "athleticnet");

  const { data: updated, error: updateErr } = await admin
    .from("external_identities")
    .update({ is_primary: true })
    .eq("id", row.id)
    .select("id,is_primary")
    .single();

  if (updateErr) {
    return jsonError(updateErr.message, "DB_ERROR", 500);
  }

  return NextResponse.json({ ok: true, id: updated.id, is_primary: updated.is_primary });
};
