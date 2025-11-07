import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServer();

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/coach/portal");
  }

  // Note: Membership check moved to portal layout to avoid redirect loop with onboarding
  return <>{children}</>;
}
