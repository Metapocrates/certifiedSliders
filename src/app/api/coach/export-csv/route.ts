import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function POST(request: Request) {
  const supabase = createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get form data
  const formData = await request.formData();
  const programId = formData.get("program_id") as string;
  const classYear = formData.get("class_year") as string;
  const event = formData.get("event") as string;
  const state = formData.get("state") as string;
  const verified = formData.get("verified") === "true";
  const search = formData.get("search") as string;

  if (!programId) {
    return NextResponse.json({ error: "Missing program_id" }, { status: 400 });
  }

  // Verify user has access to this program
  const { data: membership } = await supabase
    .from("program_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Get interested athletes using RPC (no pagination for CSV)
  const { data: athletes, error } = await supabase.rpc("rpc_list_interested_athletes", {
    _program_id: programId,
    _class_year: classYear ? parseInt(classYear, 10) : null,
    _event_code: event || null,
    _state_code: state || null,
    _only_verified: verified,
    _search_name: search || null,
    _limit: 10000, // Max for CSV export
    _offset: 0,
  });

  if (error) {
    console.error("Error fetching athletes for CSV:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  // Log export to audit_log
  await supabase.from("audit_log").insert({
    actor_user_id: user.id,
    action: "coach_export_csv",
    entity: "program",
    entity_id: programId,
    context: {
      filters: {
        class_year: classYear || null,
        event: event || null,
        state: state || null,
        verified,
        search: search || null,
      },
      count: athletes?.length || 0,
    },
  });

  // Generate CSV
  const csvRows: string[] = [];

  // Header row
  csvRows.push(
    [
      "Name",
      "Profile ID",
      "Class Year",
      "State",
      "School",
      "Stars",
      "Verified",
      "Recent PB",
      "Top Event",
      "Top Mark",
      "Intent",
      "Interested Since",
    ].join(",")
  );

  // Data rows
  if (athletes && athletes.length > 0) {
    for (const athlete of athletes) {
      const row = [
        `"${athlete.full_name || ""}"`,
        athlete.profile_id || "",
        athlete.class_year || "",
        athlete.state_code || "",
        `"${athlete.school_name || ""}"`,
        athlete.star_tier || "0",
        athlete.profile_verified ? "Yes" : "No",
        athlete.most_recent_pb_date
          ? new Date(athlete.most_recent_pb_date).toLocaleDateString()
          : "",
        athlete.top_event || "",
        athlete.top_mark || "",
        athlete.intent || "",
        new Date(athlete.interest_created_at).toLocaleDateString(),
      ];
      csvRows.push(row.join(","));
    }
  }

  const csvContent = csvRows.join("\n");

  // Return as downloadable CSV
  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="interested-athletes-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
