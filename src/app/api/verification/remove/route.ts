import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RemoveBody = {
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

  let body: RemoveBody;
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
    .select("id,user_id,provider,is_primary")
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

  const { error: deleteErr } = await admin
    .from("external_identities")
    .delete()
    .eq("id", row.id);

  if (deleteErr) {
    return jsonError(deleteErr.message, "DB_ERROR", 500);
  }

  if (row.is_primary) {
    const { data: replacement } = await admin
      .from("external_identities")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", "athleticnet")
      .eq("verified", true)
      .limit(1);

    if (replacement && replacement.length > 0) {
      await admin
        .from("external_identities")
        .update({ is_primary: true })
        .eq("id", replacement[0].id);
    }
  }

  return NextResponse.json({ ok: true });
};
