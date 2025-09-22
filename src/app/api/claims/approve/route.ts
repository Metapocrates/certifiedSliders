import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
    const form = await req.formData();
    const claimId = String(form.get("claim_id") || "");
    if (!claimId) return NextResponse.json({ ok: false, error: "missing claim_id" }, { status: 400 });

    const supabase = createSupabaseServer();
    const { error } = await supabase.rpc("approve_claim", { p_claim_id: claimId });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    revalidatePath("/admin/claims");
    return NextResponse.redirect(new URL("/admin/claims", req.url));
}
