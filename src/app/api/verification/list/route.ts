import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const runtime = "nodejs";

export const GET = async (req: NextRequest) => {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const provider = req.nextUrl.searchParams.get("provider") ?? "athleticnet";
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("external_identities")
    .select(
      "id, provider, external_id, profile_url, status, verified, verified_at, is_primary, nonce, attempts, last_checked_at, error_text"
    )
    .eq("user_id", user.id)
    .eq("provider", provider)
    .order("is_primary", { ascending: false })
    .order("verified", { ascending: false })
    .order("verified_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
};
