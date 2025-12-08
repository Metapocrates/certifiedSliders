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
  const { athlete_id, gpa, sat_score, act_score, share_with_coaches } = body;

  // Validate athlete_id matches authenticated user
  if (athlete_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate ranges
  if (gpa !== null && (gpa < 0 || gpa > 4.0)) {
    return NextResponse.json({ error: "GPA must be between 0.0 and 4.0" }, { status: 400 });
  }
  if (sat_score !== null && (sat_score < 400 || sat_score > 1600)) {
    return NextResponse.json({ error: "SAT score must be between 400 and 1600" }, { status: 400 });
  }
  if (act_score !== null && (act_score < 1 || act_score > 36)) {
    return NextResponse.json({ error: "ACT score must be between 1 and 36" }, { status: 400 });
  }

  try {
    // Upsert academic info
    const { error } = await supabase
      .from("athlete_academic_info")
      .upsert({
        athlete_id: user.id,
        gpa,
        sat_score,
        act_score,
        share_with_coaches: share_with_coaches ?? false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "athlete_id",
      });

    if (error) {
      console.error("Error upserting academic info:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error saving academic info:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save academic info" },
      { status: 500 }
    );
  }
}
