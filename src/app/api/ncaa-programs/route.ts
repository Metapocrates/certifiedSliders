import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Suggestion = {
  school_name: string;
  school_short_name: string;
  division: string | null;
  conference: string | null;
  school_slug: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length < 2) {
    return NextResponse.json({ data: [] });
  }

  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("v_ncaa_schools_tf")
      .select("school_name, school_short_name, division, conference, school_slug")
      .ilike("school_name", `%${query}%`)
      .order("school_name", { ascending: true })
      .limit(25);

    if (error) {
      console.error("[ncaa-programs] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as Suggestion[] });
  } catch (err) {
    console.error("[ncaa-programs] Unexpected error", err);
    const message = err instanceof Error ? err.message : "Failed to load NCAA programs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

