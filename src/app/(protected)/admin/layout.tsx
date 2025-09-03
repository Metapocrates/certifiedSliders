// src/app/(protected)/admin/layout.tsx
import "server-only";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "../../../lib/supabase/server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = supabaseServer();

  // Must be logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Must be an admin
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) redirect("/");

  return <>{children}</>;
}
