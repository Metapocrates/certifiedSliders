export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseServer } from "@/utils/supabase-server";

export async function GET() {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
        .from("mv_best_event")
        .select("athlete_id, full_name, event, mark, mark_seconds")
        .order("mark_seconds", { ascending: true })
        .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data ?? [] });
}
