// app/api/athletes/[username]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

type Athlete = {
    id: string;
    slug: string | null;
    full_name: string | null;
    class_year: number | null;
    gender: "M" | "F" | "X" | null;
    school_name: string | null;
    school_state: string | null;
    is_claimed: boolean;
    claim_status: "unclaimed" | "pending" | "verified" | "locked";
    external_athleticnet_id: string | null;
};

export async function GET(
    _req: Request,
    ctx: { params: { username: string } }
) {
    const supabase = createSupabaseServer();
    const slug = ctx.params.username; // <— was params.slug; folder is [username]

    const { data, error } = await supabase
        .from("athletes")
        .select(
            "id, slug, full_name, class_year, gender, school_name, school_state, is_claimed, claim_status, external_athleticnet_id"
        )
        .eq("slug", slug)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data as Athlete);
}
