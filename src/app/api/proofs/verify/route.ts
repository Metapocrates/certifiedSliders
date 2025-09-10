// src/app/api/proofs/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function POST(req: NextRequest) {
    try {
        const form = await req.formData();
        const idStr = String(form.get("resultId") ?? "");
        const resultId = Number(idStr);
        if (!Number.isFinite(resultId)) {
            return NextResponse.json({ ok: false, error: "Invalid resultId" }, { status: 400 });
        }

        const supabase = createSupabaseServer();

        // Optional: enforce admin
        const { data: me } = await supabase.auth.getUser();
        if (!me.user) {
            return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
        }
        const { data: admin } = await supabase.from("admins")
            .select("user_id").eq("user_id", me.user.id).maybeSingle();
        if (!admin) {
            return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
        }

        const { error } = await supabase.rpc("verify_result", {
            p_result_id: resultId,
            p_verified_by: me.user.id,
        });

        if (error) throw error;

        return NextResponse.json({ ok: true, resultId });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 400 });
    }
}
