// src/app/(protected)/parent/layout.tsx
// Parent Portal layout with signposting - ensures portal identity is always visible
import "server-only";
import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";

export default async function ParentPortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServer();

  // Require signed-in user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/parent/dashboard");

  // Get user profile (don't redirect - let them see the portal)
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type, full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Show warning if not parent type (but don't redirect - for testing)
  const isParentUser = profile?.user_type === "parent";

  const navItems = [
    { href: "/parent/dashboard", label: "Dashboard" },
    { href: "/parent/activity", label: "Athlete Activity" },
    { href: "/parent/onboarding", label: "Link Athlete" },
    { href: "/parent/help", label: "Help" },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Portal Identity Banner - Always visible */}
      <div className="border-b-2 border-purple-300 bg-purple-100 dark:border-purple-700 dark:bg-purple-950/50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Portal Icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white shadow-md">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-purple-900 dark:text-purple-100">
                  Parent Portal
                </span>
                <span className="rounded-full bg-purple-300 px-2.5 py-0.5 text-xs font-semibold text-purple-900 dark:bg-purple-700 dark:text-purple-100">
                  Beta
                </span>
              </div>
              <div className="text-sm text-purple-800 dark:text-purple-300">
                Read-only view of your athletes&apos; progress
              </div>
            </div>
          </div>

          {/* Quick nav on banner */}
          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-purple-800 transition hover:bg-purple-200 dark:text-purple-200 dark:hover:bg-purple-800/50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Warning if not parent user type */}
      {!isParentUser && (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          Note: Your account type is not set to &quot;parent&quot;. Some features may be limited.
        </div>
      )}

      {/* Main content */}
      <main className="bg-background">
        {children}
      </main>
    </div>
  );
}
