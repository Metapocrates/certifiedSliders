// src/app/api/debug/whoami/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function GET() {
    const supabase = createSupabaseServer();
    const { data, error } = await supabase.auth.getUser();
    return NextResponse.json(
        { ok: !error, user: data?.user ?? null, error: error?.message ?? null },
        { status: error ? 401 : 200 }
    );
}