import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const runtime = "nodejs";

export async function POST() {
  const supabase = createSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const { data, error: rpcError } = await supabase.rpc("mint_proof_token", {
    p_scope: "athleticnet_result_claim",
  });

  if (rpcError) {
    return NextResponse.json({ ok: false, error: rpcError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, token: data });
}
