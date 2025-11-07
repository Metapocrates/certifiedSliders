import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function POST(request: Request) {
  const supabase = createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { athlete_id, email, phone, share_contact_info } = body;

  // Validate athlete_id matches authenticated user
  if (athlete_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        email: email || null,
        phone: phone || null,
        share_contact_info: share_contact_info ?? false,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating contact info:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error saving contact info:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update contact info" },
      { status: 500 }
    );
  }
}
