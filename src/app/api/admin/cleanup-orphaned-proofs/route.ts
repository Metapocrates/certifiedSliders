// Admin endpoint to clean up orphaned proofs (proofs without matching results)
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();

  // Check admin
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get URL from request body
  const body = await req.json().catch(() => ({}));
  const url = body.url as string | undefined;

  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  // Delete ALL proofs with this URL (including orphaned ones)
  const { data: deletedProofs, error } = await supabase
    .from("proofs")
    .delete()
    .eq("url", url)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deletedCount: deletedProofs?.length ?? 0,
    message: `Deleted ${deletedProofs?.length ?? 0} orphaned proof(s)`,
  });
}
