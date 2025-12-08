import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get request body
  const body = await request.json();
  const { content_type, content_id, reason } = body;

  if (!content_type || !content_id) {
    return NextResponse.json(
      { error: "Missing content_type or content_id" },
      { status: 400 }
    );
  }

  if (content_type !== "bio" && content_type !== "video") {
    return NextResponse.json(
      { error: "Invalid content_type. Must be 'bio' or 'video'" },
      { status: 400 }
    );
  }

  try {
    if (content_type === "bio") {
      // Flag bio on profiles table
      // content_id is profile_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("profile_id", content_id)
        .maybeSingle();

      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          bio_flagged_at: new Date().toISOString(),
          bio_flagged_by: user.id,
          bio_flag_reason: reason || null,
        })
        .eq("id", profile.id);

      if (error) {
        console.error("Error flagging bio:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (content_type === "video") {
      // Flag video clip
      // content_id is clip UUID
      const { error } = await supabase
        .from("athlete_video_clips")
        .update({
          flagged_at: new Date().toISOString(),
          flagged_by: user.id,
          flag_reason: reason || null,
        })
        .eq("id", content_id);

      if (error) {
        console.error("Error flagging video:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error flagging content:", err);
    return NextResponse.json(
      { error: err.message || "Failed to flag content" },
      { status: 500 }
    );
  }
}
