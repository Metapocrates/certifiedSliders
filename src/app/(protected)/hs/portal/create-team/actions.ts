"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/compat";

const CreateTeamSchema = z.object({
  school_name: z.string().min(1, "School name is required"),
  city: z.string().optional(),
  state: z.string().min(2, "State is required"),
  division: z.string().optional(),
  gender: z.enum(["men", "women", "coed"]),
  contact_email: z.string().email().optional().or(z.literal("")),
  website_url: z.string().url().optional().or(z.literal("")),
  title: z.string().min(1, "Your title is required"),
  is_public: z.boolean().default(false),
});

export async function createTeamAction(formData: FormData) {
  const supabase = createSupabaseServer();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate input
  const rawData = {
    school_name: formData.get("school_name") as string,
    city: formData.get("city") as string || undefined,
    state: formData.get("state") as string,
    division: formData.get("division") as string || undefined,
    gender: formData.get("gender") as string,
    contact_email: formData.get("contact_email") as string || undefined,
    website_url: formData.get("website_url") as string || undefined,
    title: formData.get("title") as string,
    is_public: formData.get("is_public") === "on",
  };

  const validation = CreateTeamSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    };
  }

  const data = validation.data;

  try {
    // Create team
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        school_name: data.school_name,
        city: data.city || null,
        state: data.state,
        division: data.division || null,
        gender: data.gender,
        contact_email: data.contact_email || null,
        website_url: data.website_url || null,
        is_public: data.is_public,
      })
      .select("id")
      .single();

    if (teamError) {
      console.error("Error creating team:", teamError);
      return { success: false, error: "Failed to create team" };
    }

    // Add creator as head coach
    const { error: staffError } = await supabase
      .from("team_staff")
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: "head_coach",
        title: data.title,
        can_invite_athletes: true,
        can_manage_staff: true,
        can_attest_results: true,
        status: "active",
        accepted_at: new Date().toISOString(),
      });

    if (staffError) {
      console.error("Error adding staff:", staffError);
      // TODO: Rollback team creation
      return { success: false, error: "Failed to add coach to team" };
    }

    // Audit log
    await supabase.from("action_audit").insert({
      actor_id: user.id,
      action: "team_created",
      entity_type: "team",
      entity_id: team.id,
      after_state: { school_name: data.school_name, state: data.state },
    });

    revalidatePath("/hs/portal");
    return { success: true, teamId: team.id };
  } catch (error) {
    console.error("Unexpected error creating team:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
