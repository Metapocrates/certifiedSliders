"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function approveManualReviewAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;

  const supabase = await createSupabaseServer();

  // Check admin
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return;

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) return;

  // Update status to 'approved'
  await supabase
    .from("results")
    .update({ status: "approved" })
    .eq("id", id);

  revalidatePath("/admin/manual-review");
}

export async function rejectManualReviewAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const reason = String(formData.get("reason") || "");
  if (!id) return;

  const supabase = await createSupabaseServer();

  // Check admin
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return;

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) return;

  // Update status to 'invalid' with rejection reason
  await supabase
    .from("results")
    .update({
      status: "invalid",
      // Store rejection reason in a note or admin_notes field if available
      // For now, just update status
    })
    .eq("id", id);

  revalidatePath("/admin/manual-review");
}
