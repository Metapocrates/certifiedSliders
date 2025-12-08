import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get request body
  const body = await request.json();
  const { program_id, method } = body;

  if (!program_id || !method) {
    return NextResponse.json(
      { error: "Missing program_id or method" },
      { status: 400 }
    );
  }

  if (method !== "dns" && method !== "http") {
    return NextResponse.json(
      { error: "Invalid method. Must be 'dns' or 'http'" },
      { status: 400 }
    );
  }

  // Verify user has membership in this program
  const { data: membership } = await supabase
    .from("program_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("program_id", program_id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Get program domain
  const { data: program } = await supabase
    .from("programs")
    .select("domain")
    .eq("id", program_id)
    .maybeSingle();

  if (!program || !program.domain) {
    return NextResponse.json(
      { error: "Program domain not configured" },
      { status: 400 }
    );
  }

  // Generate random nonce (32 character hex)
  const nonce = randomBytes(16).toString("hex");

  // Create challenge
  const { data: challenge, error } = await supabase
    .from("coach_domain_challenges")
    .insert({
      user_id: user.id,
      program_id,
      domain: program.domain,
      method,
      nonce,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, challenge });
}
