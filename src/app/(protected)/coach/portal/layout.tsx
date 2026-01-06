// NCAA Coach Portal layout with signposting - ensures portal identity is always visible
import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";

export default async function CoachPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();

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
        short_name,
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
  // Supabase returns the joined relation - handle array or single object
  const programData = membership.programs;
  const program = Array.isArray(programData)
    ? programData[0] as { id: string; name: string; short_name?: string; is_test_program: boolean } | undefined
    : programData as { id: string; name: string; short_name?: string; is_test_program: boolean } | null;
  const isTestCoach = membership.is_test_coach || program?.is_test_program;
  const programName = program?.short_name || program?.name || "Your Program";

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  const isCoachUser = profile?.user_type === "ncaa_coach";

  const navItems = [
    { href: "/coach/portal", label: "Dashboard" },
    { href: "/coach/portal/watchlist", label: "Watchlist" },
    { href: "/coach/verify", label: "Verification" },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Portal Identity Banner - Always visible */}
      <div className="border-b-2 border-blue-300 bg-blue-100 dark:border-blue-700 dark:bg-blue-950/50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Portal Icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-blue-900 dark:text-blue-100">
                  NCAA Coach Portal
                </span>
                <span className="rounded-full bg-blue-300 px-2.5 py-0.5 text-xs font-semibold text-blue-900 dark:bg-blue-700 dark:text-blue-100">
                  Beta
                </span>
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                {programName}
              </div>
            </div>
          </div>

          {/* Quick nav on banner */}
          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-blue-800 transition hover:bg-blue-200 dark:text-blue-200 dark:hover:bg-blue-800/50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Test Environment Warning */}
      {isTestCoach && (
        <div className="border-b border-yellow-300 bg-yellow-100 px-4 py-3 dark:border-yellow-700 dark:bg-yellow-900/30">
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
                You are using a test program account. This is for internal testing only.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning if not ncaa_coach user type */}
      {!isCoachUser && !isTestCoach && (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          Note: Your account type is not set to &quot;ncaa_coach&quot;. Some features may be limited.
        </div>
      )}

      {/* Main content */}
      <main className="bg-background">
        {children}
      </main>
    </div>
  );
}
