import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const runtime = "nodejs";

type EventPreference = {
  event: string;
  is_featured: boolean;
  display_order: number;
};

type UpdatePreferencesBody = {
  preferences?: EventPreference[];
};

function jsonError(message: string, code: string, status = 400) {
  return NextResponse.json({ error: message, code }, { status });
}

// GET /api/profile/event-preferences - Get athlete's event preferences
export const GET = async (req: NextRequest) => {
  const user = await getSessionUser();
  if (!user) {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const supabase = createSupabaseServer();

  const { data, error } = await supabase
    .from("athlete_event_preferences")
    .select("event, is_featured, display_order, created_at, updated_at")
    .eq("athlete_id", user.id)
    .order("is_featured", { ascending: false })
    .order("display_order", { ascending: true });

  if (error) {
    return jsonError(error.message, "DB_ERROR", 500);
  }

  return NextResponse.json({ ok: true, preferences: data });
};

// PUT /api/profile/event-preferences - Bulk upsert event preferences
export const PUT = async (req: NextRequest) => {
  const user = await getSessionUser();
  if (!user) {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  let body: UpdatePreferencesBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body", "BAD_REQUEST");
  }

  if (!body.preferences || !Array.isArray(body.preferences)) {
    return jsonError("Missing or invalid preferences array", "MISSING_PREFERENCES");
  }

  // Validate max featured events (default 5)
  const MAX_FEATURED = 5;
  const featuredCount = body.preferences.filter((p) => p.is_featured).length;
  if (featuredCount > MAX_FEATURED) {
    return jsonError(
      `You can only feature up to ${MAX_FEATURED} events`,
      "TOO_MANY_FEATURED"
    );
  }

  const supabase = createSupabaseServer();

  // Delete all existing preferences for this user
  const { error: deleteError } = await supabase
    .from("athlete_event_preferences")
    .delete()
    .eq("athlete_id", user.id);

  if (deleteError) {
    return jsonError(deleteError.message, "DB_ERROR", 500);
  }

  // Insert new preferences
  if (body.preferences.length > 0) {
    const { error: insertError } = await supabase
      .from("athlete_event_preferences")
      .insert(
        body.preferences.map((p) => ({
          athlete_id: user.id,
          event: p.event,
          is_featured: p.is_featured,
          display_order: p.display_order,
        }))
      );

    if (insertError) {
      return jsonError(insertError.message, "DB_ERROR", 500);
    }
  }

  return NextResponse.json({ ok: true, updated: body.preferences.length });
};
