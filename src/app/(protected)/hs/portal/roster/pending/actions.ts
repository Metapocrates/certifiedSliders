"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/compat";

const ReviewJoinRequestSchema = z.object({
  team_id: z.string().uuid(),
  request_id: z.string().uuid(),
  decision: z.enum(["approved", "denied"]),
});

export async function reviewJoinRequestAction(formData: FormData) {
  const supabase = await createSupabaseServer();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate input
  const rawData = {
    team_id: formData.get("team_id") as string,
    request_id: formData.get("request_id") as string,
    decision: formData.get("decision") as string,
  };

  const validation = ReviewJoinRequestSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    };
  }

  const data = validation.data;

  try {
    // Verify user has permission
    const { data: staffRecord } = await supabase
      .from("team_staff")
      .select("id, can_invite_athletes")
      .eq("team_id", data.team_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!staffRecord || !staffRecord.can_invite_athletes) {
      return { success: false, error: "You don't have permission to manage join requests" };
    }

    // Get the request details
    const { data: request } = await supabase
      .from("hs_athlete_team_requests")
      .select("athlete_id, status")
      .eq("id", data.request_id)
      .eq("team_id", data.team_id)
      .maybeSingle();

    if (!request) {
      return { success: false, error: "Request not found" };
    }

    if (request.status !== "pending") {
      return { success: false, error: "This request has already been processed" };
    }

    // Update request status
    const { error: updateError } = await supabase
      .from("hs_athlete_team_requests")
      .update({
        status: data.decision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.request_id);

    if (updateError) {
      console.error("Error updating request:", updateError);
      return { success: false, error: "Failed to process request" };
    }

    // If approved, add athlete to roster
    if (data.decision === "approved") {
      const { error: membershipError } = await supabase
        .from("team_memberships")
        .insert({
          team_id: data.team_id,
          athlete_id: request.athlete_id,
          status: "active",
          joined_at: new Date().toISOString(),
        });

      if (membershipError) {
        console.error("Error adding athlete to roster:", membershipError);
        // Rollback request update
        await supabase
          .from("hs_athlete_team_requests")
          .update({ status: "pending", reviewed_by: null, reviewed_at: null })
          .eq("id", data.request_id);
        return { success: false, error: "Failed to add athlete to roster" };
      }
    }

    // Audit log
    await supabase.from("action_audit").insert({
      actor_id: user.id,
      action: `hs_request_${data.decision}`,
      entity_type: "hs_athlete_team_request",
      entity_id: data.request_id,
      after_state: { decision: data.decision, athlete_id: request.athlete_id },
    });

    // TODO: Send email notification to athlete

    revalidatePath("/hs/portal/roster");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error reviewing request:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
