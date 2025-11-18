import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import ProgramSelector from "@/components/coach/ProgramSelector";

export default async function CoachOnboardingPage() {
  const supabase = createSupabaseServer();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Check if user already has program memberships
  const { data: existingMemberships } = await supabase
    .from("program_memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (existingMemberships && existingMemberships.length > 0) {
    redirect("/coach/portal");
  }

  // Fetch all available programs (including test flags)
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, short_name, division, location_city, location_state, is_test_program")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Welcome to the Coach Portal</h1>
          <p className="text-muted-foreground">
            Select your program to get started. You&apos;ll be able to view athletes who have expressed interest in your program.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Select Your Program</h2>
          <ProgramSelector programs={programs || []} />
        </div>

        <div className="text-sm text-muted-foreground">
          <p>
            Note: In Phase 2, you&apos;ll be able to verify your affiliation through SSO or domain proof.
            For now, self-service signup is enabled for testing.
          </p>
        </div>
      </div>
    </div>
  );
}
