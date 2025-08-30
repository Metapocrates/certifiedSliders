export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const envOk = Boolean(url && key);

    let dbOk = false, error: string | null = null;
    if (envOk) {
        const supabase = createClient(url!, key!);
        const { error: e } = await supabase
            .from("mv_best_event")
            .select("*", { head: true, count: "exact" })
            .limit(1);
        if (e) error = e.message; else dbOk = true;
    }
    return NextResponse.json({ envOk, dbOk, error }, { status: envOk ? 200 : 500 });
}
