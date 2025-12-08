import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { athlete_id, visibility } = body;

  // Validate athlete_id matches authenticated user
  if (athlete_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate visibility value
  if (!["private", "coaches", "public"].includes(visibility)) {
    return NextResponse.json(
      { error: "visibility must be 'private', 'coaches', or 'public'" },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ bio_visibility: visibility })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating bio visibility:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error saving bio visibility:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update bio visibility" },
      { status: 500 }
    );
  }
}
