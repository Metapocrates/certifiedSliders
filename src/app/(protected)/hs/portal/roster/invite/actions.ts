"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/compat";

const InviteAthleteSchema = z.object({
  team_id: z.string().uuid(),
  athlete_id: z.string().uuid(),
  message: z.string().max(500).optional(),
});

export async function inviteAthleteAction(formData: FormData) {
  const supabase = createSupabaseServer();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate input
  const rawData = {
    team_id: formData.get("team_id") as string,
    athlete_id: formData.get("athlete_id") as string,
    message: formData.get("message") as string || undefined,
  };

  const validation = InviteAthleteSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0].message,
    };
  }

  const data = validation.data;

  try {
    // Verify user has permission to invite
    const { data: staffRecord } = await supabase
      .from("team_staff")
      .select("id, can_invite_athletes")
      .eq("team_id", data.team_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!staffRecord || !staffRecord.can_invite_athletes) {
      return { success: false, error: "You don't have permission to invite athletes" };
    }

    // Check rate limit (10 invites per 24 hours)
    const rateLimitOk = await supabase.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_bucket_key: `hs_invite_athlete:${data.team_id}`,
      p_max_count: 10,
      p_window_hours: 24,
    });

    if (!rateLimitOk.data) {
      return { success: false, error: "Rate limit exceeded. You can send up to 10 invites per 24 hours." };
    }

    // Check if athlete is already on roster
    const { data: existingMembership } = await supabase
      .from("team_memberships")
      .select("id")
      .eq("team_id", data.team_id)
      .eq("athlete_id", data.athlete_id)
      .maybeSingle();

    if (existingMembership) {
      return { success: false, error: "This athlete is already on your roster" };
    }

    // Check for pending invite
    const { data: pendingInvite } = await supabase
      .from("hs_coach_athlete_invites")
      .select("id")
      .eq("team_id", data.team_id)
      .eq("athlete_id", data.athlete_id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (pendingInvite) {
      return { success: false, error: "An invitation is already pending for this athlete" };
    }

    // Create invite
    const { error: inviteError } = await supabase
      .from("hs_coach_athlete_invites")
      .insert({
        team_id: data.team_id,
        inviter_id: user.id,
        athlete_id: data.athlete_id,
        message: data.message || null,
        status: "pending",
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      });

    if (inviteError) {
      console.error("Error creating invite:", inviteError);
      return { success: false, error: "Failed to send invitation" };
    }

    // Audit log
    await supabase.from("action_audit").insert({
      actor_id: user.id,
      action: "hs_invite_sent",
      entity_type: "hs_coach_athlete_invite",
      entity_id: data.athlete_id,
      after_state: { team_id: data.team_id, athlete_id: data.athlete_id },
    });

    // TODO: Queue email notification to athlete

    revalidatePath("/hs/portal/roster");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error inviting athlete:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
