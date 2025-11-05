import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const runtime = "nodejs";

type UpdateAliasBody = {
  alias?: string;
  type?: "nickname" | "alt_legal" | "maiden" | "other";
  is_public?: boolean;
};

function jsonError(message: string, code: string, status = 400) {
  return NextResponse.json({ error: message, code }, { status });
}

// PATCH /api/profile/aliases/[id] - Update alias
export const PATCH = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const user = await getSessionUser();
  if (!user) {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  let body: UpdateAliasBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body", "BAD_REQUEST");
  }

  const supabase = createSupabaseServer();

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from("athlete_aliases")
    .select("id, athlete_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) {
    return jsonError(fetchError.message, "DB_ERROR", 500);
  }

  if (!existing) {
    return jsonError("Alias not found", "NOT_FOUND", 404);
  }

  if (existing.athlete_id !== user.id) {
    return jsonError("You do not have access to this alias", "NOT_OWNER", 403);
  }

  // Build update object
  const updates: any = {};
  if (body.alias !== undefined) {
    if (!body.alias.trim() || body.alias.trim().length < 2 || body.alias.trim().length > 100) {
      return jsonError("Alias must be between 2 and 100 characters", "INVALID_ALIAS");
    }
    updates.alias = body.alias.trim();
  }
  if (body.type !== undefined) updates.type = body.type;
  if (body.is_public !== undefined) updates.is_public = body.is_public;

  if (Object.keys(updates).length === 0) {
    return jsonError("No updates provided", "NO_UPDATES");
  }

  // Update alias
  const { data, error } = await supabase
    .from("athlete_aliases")
    .update(updates)
    .eq("id", params.id)
    .eq("athlete_id", user.id)
    .select("id, alias, type, is_public, updated_at")
    .single();

  if (error) {
    return jsonError(error.message, "DB_ERROR", 500);
  }

  return NextResponse.json({ ok: true, alias: data });
};

// DELETE /api/profile/aliases/[id] - Delete alias
export const DELETE = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const user = await getSessionUser();
  if (!user) {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const supabase = createSupabaseServer();

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from("athlete_aliases")
    .select("id, athlete_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) {
    return jsonError(fetchError.message, "DB_ERROR", 500);
  }

  if (!existing) {
    return jsonError("Alias not found", "NOT_FOUND", 404);
  }

  if (existing.athlete_id !== user.id) {
    return jsonError("You do not have access to this alias", "NOT_OWNER", 403);
  }

  // Delete alias
  const { error } = await supabase
    .from("athlete_aliases")
    .delete()
    .eq("id", params.id)
    .eq("athlete_id", user.id);

  if (error) {
    return jsonError(error.message, "DB_ERROR", 500);
  }

  return NextResponse.json({ ok: true });
};
