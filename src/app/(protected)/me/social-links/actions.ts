"use server";

import { createSupabaseServer } from "@/lib/supabase/compat";

export type SocialLinks = {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  twitter?: string;
  [key: string]: string | undefined;
};

export async function updateSocialLinks(links: SocialLinks) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Not authenticated" };
  }

  // Call the RPC function from our migration
  const { data, error } = await supabase.rpc("rpc_update_social_links", {
    _links: links,
  });

  if (error) {
    console.error("[updateSocialLinks] error:", error);
    return { ok: false, message: error.message };
  }

  // The RPC returns a table with success and message
  const result = data?.[0];
  if (!result?.success) {
    return { ok: false, message: result?.message || "Update failed" };
  }

  return { ok: true, message: result.message };
}
