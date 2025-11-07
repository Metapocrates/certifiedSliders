import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function POST(request: Request) {
  const supabase = createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Get form data
  const formData = await request.formData();
  const programId = formData.get("program_id") as string;

  if (!programId) {
    return NextResponse.json({ error: "Missing program_id" }, { status: 400 });
  }

  // Create program membership
  const { error } = await supabase
    .from("program_memberships")
    .insert({
      program_id: programId,
      user_id: user.id,
      role: "coach",
    });

  if (error) {
    console.error("Error creating program membership:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Redirect to portal
  return NextResponse.redirect(new URL("/coach/portal", request.url));
}
