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
  const { athlete_id, youtube_url, title, event_code } = body;

  // Validate athlete_id matches authenticated user
  if (athlete_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!youtube_url || !youtube_url.trim()) {
    return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
  }

  try {
    // Check current count of active clips
    const { data: existingClips, error: countError } = await supabase
      .from("athlete_video_clips")
      .select("id")
      .eq("athlete_id", user.id)
      .eq("is_archived", false);

    if (countError) {
      console.error("Error checking clip count:", countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if (existingClips && existingClips.length >= 5) {
      return NextResponse.json(
        { error: "Maximum of 5 active video clips allowed" },
        { status: 400 }
      );
    }

    // Get next display_order
    const nextOrder = existingClips ? existingClips.length : 0;

    // Insert new clip (trigger will extract youtube_id automatically)
    const { error } = await supabase
      .from("athlete_video_clips")
      .insert({
        athlete_id: user.id,
        youtube_url: youtube_url.trim(),
        title: title?.trim() || null,
        event_code: event_code?.trim() || null,
        display_order: nextOrder,
        is_archived: false,
      });

    if (error) {
      console.error("Error inserting video clip:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error adding video clip:", err);
    return NextResponse.json(
      { error: err.message || "Failed to add video clip" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { clip_id } = body;

  if (!clip_id) {
    return NextResponse.json({ error: "clip_id is required" }, { status: 400 });
  }

  try {
    // Verify ownership and delete
    const { error } = await supabase
      .from("athlete_video_clips")
      .delete()
      .eq("id", clip_id)
      .eq("athlete_id", user.id);

    if (error) {
      console.error("Error deleting video clip:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error removing video clip:", err);
    return NextResponse.json(
      { error: err.message || "Failed to remove video clip" },
      { status: 500 }
    );
  }
}
