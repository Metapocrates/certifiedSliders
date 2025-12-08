"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function submitPortalInterestAction(formData: FormData) {
  const supabase = await createSupabaseServer();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  // Get form data
  const notifyMe = formData.get("notify") === "on";
  const feedback = formData.get("feedback");
  const feedbackText =
    typeof feedback === "string" ? feedback.trim().slice(0, 2000) || null : null;

  // Update profile
  const { error } = await supabase
    .from("profiles")
    .update({
      portal_notify_me: notifyMe,
      portal_feedback_note: feedbackText,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/ncaa-coach");
  revalidatePath("/hs-coach");
  revalidatePath("/parent");
}
