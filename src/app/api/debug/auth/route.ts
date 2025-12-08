// src/app/api/debug/auth/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function GET() {
    const supabase = await createSupabaseServer();
    const { data: { user }, error } = await supabase.auth.getUser();

    // Return a tiny payload to confirm whether the SERVER sees your session
    return NextResponse.json({
        ok: !!user,
        user: user ? { id: user.id, email: user.email } : null,
        err: error ? String(error.message || error) : null,
    });
}