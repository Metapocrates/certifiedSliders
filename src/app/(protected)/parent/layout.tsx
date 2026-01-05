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

  // Verify user has parent role
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.user_type !== "parent") {
    redirect("/me");
  }

  const navItems = [
    { href: "/parent/dashboard", label: "Dashboard" },
    { href: "/parent/activity", label: "Athlete Activity" },
    { href: "/parent/onboarding", label: "Link Athlete" },
    { href: "/parent/help", label: "Help" },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Portal Identity Banner */}
      <div className="border-b border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Portal Icon */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                  Parent Portal
                </span>
                <span className="rounded-full bg-purple-200 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-800 dark:text-purple-200">
                  Beta
                </span>
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300">
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
                className="rounded-md px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-100 dark:text-purple-300 dark:hover:bg-purple-900/50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="bg-background">
        {children}
      </main>
    </div>
  );
}
