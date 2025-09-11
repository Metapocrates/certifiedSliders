export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const { data: { session } } = await supabaseServer().auth.getSession();
  if (!session) {
    // Optional: console.log on the server to see when/why this triggers
    // console.log("[auth] redirect -> /signin (no server session)");
    redirect("/signin");
  }
  return <>{children}</>;
}
