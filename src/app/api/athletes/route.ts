export const runtime = "edge";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/utils/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const classYear = searchParams.get("class_year");
    const gender = searchParams.get("gender");
    const state = searchParams.get("state");

    const supabase = await supabaseServer();

    // Start with base query joining profiles for additional data
    let queryBuilder = supabase
        .from("profiles")
        .select("id, profile_id, full_name, username, school_name, school_state, class_year, gender, profile_pic_url, star_rating")
        .not("profile_id", "is", null) // Only athletes with public profiles
        .eq("status", "active") // Only show active profiles in public search
        .eq("user_type", "athlete"); // Only show athletes in athlete search

    // Text search on name or aliases
    if (query) {
        // Search in full_name, username, or aliases
        const { data: aliasMatches } = await supabase
            .from("athlete_aliases")
            .select("athlete_id")
            .ilike("alias", `%${query}%`)
            .eq("is_public", true);

        const aliasIds = aliasMatches?.map(a => a.athlete_id) ?? [];

        // Search by name OR by alias athlete_id
        if (aliasIds.length > 0) {
            queryBuilder = queryBuilder.or(`full_name.ilike.%${query}%,username.ilike.%${query}%,id.in.(${aliasIds.join(",")})`);
        } else {
            queryBuilder = queryBuilder.or(`full_name.ilike.%${query}%,username.ilike.%${query}%`);
        }
    }

    // Filter by class year
    if (classYear) {
        queryBuilder = queryBuilder.eq("class_year", parseInt(classYear));
    }

    // Filter by gender
    if (gender && gender !== "all") {
        queryBuilder = queryBuilder.eq("gender", gender);
    }

    // Filter by state
    if (state) {
        queryBuilder = queryBuilder.eq("school_state", state);
    }

    // Order by star rating desc, then name
    queryBuilder = queryBuilder
        .order("star_rating", { ascending: false, nullsFirst: false })
        .order("full_name", { ascending: true })
        .limit(50);

    const { data, error } = await queryBuilder;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data ?? [] });
}
