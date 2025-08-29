import { NextResponse } from "next/server";
import { supabaseServer } from "@/utils/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { username: string } }) {
    const supabase = supabaseServer();
    const { data, error } = await supabase
        .from("mv_best_event")
        .select("athlete_id, full_name, school_name, school_state, class_year, gender, event, mark, mark_seconds")
        .eq("athlete_id", params.username)
        .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data ?? [] });
}
