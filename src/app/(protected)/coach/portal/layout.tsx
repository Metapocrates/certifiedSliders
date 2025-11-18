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

  // Check if user has any program memberships and fetch program info
  const { data: memberships, error } = await supabase
    .from("program_memberships")
    .select(`
      id,
      program_id,
      is_test_coach,
      programs:program_id (
        id,
        name,
        is_test_program
      )
    `)
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

  // Check if this is a test coach
  const membership = memberships[0];
  const program = membership.programs as any;
  const isTestCoach = membership.is_test_coach || program?.is_test_program;

  return (
    <>
      {isTestCoach && (
        <div className="sticky top-0 z-50 border-b border-yellow-300 bg-yellow-100 px-4 py-3 dark:border-yellow-700 dark:bg-yellow-900/30">
          <div className="container mx-auto flex items-center gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-yellow-700 dark:text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
                Test Environment
              </div>
              <div className="text-xs text-yellow-800 dark:text-yellow-300">
                You are signed in as a coach for {program?.name || 'a test program'}.
                This account is for internal testing only and does not represent a real NCAA program.
              </div>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
