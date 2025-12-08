import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut(); // clears Supabase auth cookies
    return NextResponse.json({ ok: true });
}
