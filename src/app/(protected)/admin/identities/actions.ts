"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

const ADMIN_PATH = "/admin/identities";

async function requireAdmin() {
  const supabase = createSupabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("not_authenticated");
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    throw new Error(adminError.message);
  }

  if (!adminRow) {
    throw new Error("not_authorized");
  }

  return { supabase, userId: user.id };
}

function generateNonce() {
  return randomUUID().replace(/-/g, "").slice(0, 16);
}

export async function forceVerifyIdentityAction(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("missing_identity_id");
  }

  const makePrimary = formData.get("makePrimary") === "true";

  const { supabase } = await requireAdmin();

  const {
    data: identity,
    error: fetchError,
  } = await supabase
    .from("external_identities")
    .select("user_id, provider")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!identity) {
    throw new Error("identity_not_found");
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("external_identities")
    .update({
      status: "verified",
      verified: true,
      verified_at: now,
      is_primary: makePrimary ? true : undefined,
      error_text: null,
      attempts: 0,
      last_checked_at: now,
    })
    .eq("id", id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (makePrimary) {
    await supabase
      .from("external_identities")
      .update({ is_primary: false })
      .eq("user_id", identity.user_id)
      .eq("provider", identity.provider)
      .neq("id", id);
  }

  revalidatePath(ADMIN_PATH);
}

export async function resetIdentityAction(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("missing_identity_id");
  }

  const { supabase } = await requireAdmin();

  const nonce = generateNonce();

  const { error } = await supabase
    .from("external_identities")
    .update({
      status: "pending",
      verified: false,
      verified_at: null,
      is_primary: false,
      nonce,
      attempts: 0,
      error_text: null,
      last_checked_at: null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(ADMIN_PATH);
}

export async function deleteIdentityAction(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("missing_identity_id");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("external_identities").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(ADMIN_PATH);
}
