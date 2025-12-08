"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/compat";

const SimpleProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username too long")
    .regex(/^[a-z0-9-_]+$/i, "Letters, numbers, dashes and underscores only"),
  full_name: z.string().trim().min(2, "Full name required").max(100, "Name too long"),
  bio: z.string().max(500, "Bio too long").optional().or(z.literal("")),
});

type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string>; formError?: string };

export async function updateSimpleProfileAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (!user || authErr) {
    return { ok: false, formError: "You must be signed in." };
  }

  const raw = {
    username: (formData.get("username") as string | null) ?? "",
    full_name: (formData.get("full_name") as string | null) ?? "",
    bio: (formData.get("bio") as string | null) ?? "",
  };

  const parsed = SimpleProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [key, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
      const first = issues?.[0];
      if (first) fieldErrors[key] = first;
    }
    return { ok: false, fieldErrors };
  }

  const values = parsed.data;

  // Enforce unique username (ignore current user)
  const { data: taken, error: checkErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", values.username)
    .neq("id", user.id)
    .limit(1);
  if (checkErr) {
    return { ok: false, formError: checkErr.message };
  }
  if (taken && taken.length > 0) {
    return {
      ok: false,
      fieldErrors: { username: "That username is taken. Try another." },
    };
  }

  // Update profile
  const { error } = await supabase
    .from("profiles")
    .update({
      username: values.username,
      full_name: values.full_name,
      bio: values.bio || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, formError: error.message };
  }

  return { ok: true };
}
