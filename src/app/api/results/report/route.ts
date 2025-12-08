import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { z } from "zod";

const ReportSchema = z.object({
  result_id: z.number().int().positive(),
  reason: z.string().min(1).max(500),
  details: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();

  // Check authentication
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const validated = ReportSchema.parse(body);

    // Check if user already reported this result
    const { data: existing } = await supabase
      .from("result_reports")
      .select("id")
      .eq("result_id", validated.result_id)
      .eq("reported_by", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "You have already reported this result" },
        { status: 400 }
      );
    }

    // Create report
    const { error } = await supabase
      .from("result_reports")
      .insert({
        result_id: validated.result_id,
        reported_by: user.id,
        reason: validated.reason,
        details: validated.details || null,
        status: "pending",
      });

    if (error) {
      console.error("[Report] Insert error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to submit report" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[Report] Error:", err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: err.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: err.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
