// src/app/(protected)/admin/class-year-override/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function overrideClassYearAction(formData: FormData) {
  const supabase = createSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    throw new Error("Unauthorized - not signed in");
  }

  // Verify admin status
  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    throw new Error("Unauthorized - not an admin");
  }

  const userIdInput = formData.get("user_id")?.toString().trim();
  const newClassYear = formData.get("new_class_year")?.toString().trim();
  const reason = formData.get("reason")?.toString().trim();

  if (!userIdInput || !newClassYear || !reason) {
    throw new Error("All fields are required");
  }

  const classYearNum = parseInt(newClassYear, 10);
  if (isNaN(classYearNum) || classYearNum < 2024 || classYearNum > 2099) {
    throw new Error("Invalid class year");
  }

  // Resolve user ID - could be UUID or profile_id (CS-XXXXX)
  let targetUserId: string;

  if (userIdInput.startsWith("CS-")) {
    // It's a profile ID, look up the user_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("profile_id", userIdInput)
      .maybeSingle();

    if (!profile) {
      throw new Error(`Profile not found with ID: ${userIdInput}`);
    }

    targetUserId = profile.id;
  } else {
    // Assume it's a UUID
    targetUserId = userIdInput;
  }

  // Get current profile state
  const { data: currentProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, class_year, class_year_locked_at, full_name, username")
    .eq("id", targetUserId)
    .maybeSingle();

  if (profileError || !currentProfile) {
    throw new Error(`Profile not found for user ID: ${targetUserId}`);
  }

  const oldClassYear = currentProfile.class_year;

  // Create audit log entry BEFORE making the change
  const { error: auditError } = await supabase.from("audit_logs").insert({
    action: "class_year_override",
    entity_type: "profile",
    entity_id: targetUserId,
    actor_id: user.id,
    old_value: { class_year: oldClassYear },
    new_value: { class_year: classYearNum },
    reason,
    metadata: {
      profile_name: currentProfile.full_name || currentProfile.username,
      locked_at: currentProfile.class_year_locked_at,
      admin_name: user.email,
    },
  });

  if (auditError) {
    throw new Error(`Failed to create audit log: ${auditError.message}`);
  }

  // Update the class year
  // The trigger will allow this because auth.uid() is an admin
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ class_year: classYearNum })
    .eq("id", targetUserId);

  if (updateError) {
    throw new Error(`Failed to update class year: ${updateError.message}`);
  }

  revalidatePath("/admin/class-year-override");
  redirect("/admin/class-year-override?success=true");
}
