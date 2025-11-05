import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const runtime = "nodejs";

type CreateAliasBody = {
  alias?: string;
  type?: "nickname" | "alt_legal" | "maiden" | "other";
  is_public?: boolean;
};

function jsonError(message: string, code: string, status = 400) {
  return NextResponse.json({ error: message, code }, { status });
}

// GET /api/profile/aliases - Get athlete's aliases
export const GET = async (req: NextRequest) => {
  const user = await getSessionUser();
  if (!user) {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const supabase = createSupabaseServer();

  const { data, error } = await supabase
    .from("athlete_aliases")
    .select("id, alias, type, is_public, created_at, updated_at")
    .eq("athlete_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return jsonError(error.message, "DB_ERROR", 500);
  }

  return NextResponse.json({ ok: true, aliases: data });
};

// POST /api/profile/aliases - Create new alias
export const POST = async (req: NextRequest) => {
  const user = await getSessionUser();
  if (!user) {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  let body: CreateAliasBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body", "BAD_REQUEST");
  }

  if (!body.alias || !body.alias.trim()) {
    return jsonError("Alias is required", "MISSING_ALIAS");
  }

  // Validate alias length
  if (body.alias.trim().length < 2 || body.alias.trim().length > 100) {
    return jsonError("Alias must be between 2 and 100 characters", "INVALID_ALIAS_LENGTH");
  }

  const supabase = createSupabaseServer();

  // Check if alias already exists for this athlete
  const { data: existing } = await supabase
    .from("athlete_aliases")
    .select("id")
    .eq("athlete_id", user.id)
    .eq("alias", body.alias.trim())
    .maybeSingle();

  if (existing) {
    return jsonError("You already have this alias", "DUPLICATE_ALIAS");
  }

  // Create alias
  const { data, error } = await supabase
    .from("athlete_aliases")
    .insert({
      athlete_id: user.id,
      alias: body.alias.trim(),
      type: body.type || "nickname",
      is_public: body.is_public !== undefined ? body.is_public : true,
    })
    .select("id, alias, type, is_public, created_at")
    .single();

  if (error) {
    return jsonError(error.message, "DB_ERROR", 500);
  }

  return NextResponse.json({ ok: true, alias: data });
};
