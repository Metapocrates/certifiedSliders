"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/compat";

const AttestResultSchema = z.object({
  team_id: z.string().uuid(),
  result_id: z.coerce.number(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().max(500).optional(),
});

export async function attestResultAction(formData: FormData) {
  const supabase = await createSupabaseServer();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate input
  const rawData = {
    team_id: formData.get("team_id") as string,
    result_id: formData.get("result_id") as string,
    decision: formData.get("decision") as string,
    notes: formData.get("notes") as string || undefined,
  };

  const validation = AttestResultSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    };
  }

  const data = validation.data;

  try {
    // Verify user has permission to attest
    const { data: staffRecord } = await supabase
      .from("team_staff")
      .select("id, can_attest_results")
      .eq("team_id", data.team_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!staffRecord || !staffRecord.can_attest_results) {
      return { success: false, error: "You don't have permission to attest results" };
    }

    // Verify result belongs to a team athlete
    const { data: result } = await supabase
      .from("results")
      .select("athlete_id")
      .eq("id", data.result_id)
      .maybeSingle();

    if (!result) {
      return { success: false, error: "Result not found" };
    }

    const { data: membership } = await supabase
      .from("team_memberships")
      .select("id")
      .eq("team_id", data.team_id)
      .eq("athlete_id", result.athlete_id)
      .eq("status", "active")
      .maybeSingle();

    if (!membership) {
      return { success: false, error: "This athlete is not on your team" };
    }

    // Check if already attested
    const { data: existingAttestation } = await supabase
      .from("hs_attestations")
      .select("id")
      .eq("result_id", data.result_id)
      .maybeSingle();

    if (existingAttestation) {
      return { success: false, error: "This result has already been attested" };
    }

    // Create attestation
    const { error: attestError } = await supabase
      .from("hs_attestations")
      .insert({
        result_id: data.result_id,
        team_id: data.team_id,
        attester_id: user.id,
        decision: data.decision,
        notes: data.notes || null,
      });

    if (attestError) {
      console.error("Error creating attestation:", attestError);
      return { success: false, error: "Failed to attest result" };
    }

    // Audit log
    await supabase.from("action_audit").insert({
      actor_id: user.id,
      action: `hs_attest_${data.decision}`,
      entity_type: "result",
      entity_id: data.result_id.toString(),
      after_state: { decision: data.decision, notes: data.notes },
    });

    // TODO: If approved, potentially auto-verify the result or notify admins

    revalidatePath("/hs/portal/attest");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error attesting result:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
