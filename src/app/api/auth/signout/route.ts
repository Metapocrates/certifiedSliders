import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const supabase = await createSupabaseServer();
    // Clear local session and all cookies
    await supabase.auth.signOut({ scope: 'local' });
    return NextResponse.json({ ok: true });
}
