import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";

export default async function CoachPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServer();

  // Get authenticated user (already checked in parent layout)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/coach/portal");
  }

  // Check if user has any program memberships
  const { data: memberships, error } = await supabase
    .from("program_memberships")
    .select("id, program_id")
    .eq("user_id", user.id)
    .limit(1);

  if (error) {
    console.error("Error checking program memberships:", error);
    redirect("/");
  }

  // If no program memberships, redirect to onboarding
  if (!memberships || memberships.length === 0) {
    redirect("/coach/onboarding");
  }

  return <>{children}</>;
}
