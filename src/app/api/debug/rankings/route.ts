export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseServer } from "@/utils/supabase-server";


export async function GET() {
    const supabase = supabaseServer();
    const { data, error, count } = await supabase
        .from("mv_best_event")
        .select("*", { count: "exact" })
        .limit(1);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const sample = data?.[0] ?? null;
    const columns = sample ? Object.keys(sample) : [];
    return NextResponse.json({ ok: true, count, columns, sample });
}
