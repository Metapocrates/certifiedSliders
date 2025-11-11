// src/app/api/parent/linked-athletes/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function GET() {
  const supabase = createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all accepted parent links with athlete profile data
  const { data: links, error } = await supabase
    .from("parent_links")
    .select(`
      id,
      athlete_id,
      status,
      profile:profiles!athlete_id (
        full_name,
        username,
        profile_id
      )
    `)
    .eq("parent_user_id", user.id)
    .eq("status", "accepted");

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch linked athletes" },
      { status: 500 }
    );
  }

  return NextResponse.json({ athletes: links || [] });
}
