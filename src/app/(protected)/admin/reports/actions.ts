"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function dismissReportAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;

  const supabase = await createSupabaseServer();

  // Check admin
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  if (!user) return;

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) return;

  // Update report status to dismissed
  await supabase
    .from("result_reports")
    .update({
      status: "dismissed",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/reports");
}

export async function actionReportAction(formData: FormData) {
  const reportId = Number(formData.get("id"));
  const resultId = Number(formData.get("result_id"));

  if (!reportId || !resultId) return;

  const supabase = await createSupabaseServer();

  // Check admin
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  if (!user) return;

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) return;

  // Mark result as invalid
  await supabase
    .from("results")
    .update({
      status: "invalid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", resultId);

  // Update report status to actioned
  await supabase
    .from("result_reports")
    .update({
      status: "actioned",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: "Result marked as invalid",
    })
    .eq("id", reportId);

  revalidatePath("/admin/reports");
}
