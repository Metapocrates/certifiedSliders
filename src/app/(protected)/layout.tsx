export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { ReactNode } from "react"; // <- type-only import fixes TS1484
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * All routes under (protected) require an authenticated session.
 * Server-only check avoids client hydration races & redirect loops.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/signin");

  return <>{children}</>;
}
