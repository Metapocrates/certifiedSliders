import "server-only";
import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServer();

  // Require signed-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login"); // or "/signin" if that's your route

  // Require admin
  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) redirect("/");

  // Sidebar + content (your original UI)
  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/results", label: "Verify Results" },
    { href: "/admin/ratings", label: "Star Ratings" },
    { href: "/admin/standards", label: "Standards" },
    { href: "/admin/featured", label: "Featured Profiles" },
    { href: "/admin/blog", label: "Blog" },
  ];

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="w-72 border-r bg-card/70 px-5 py-8">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted">
              Certified Sliders
            </p>
            <h2 className="mt-2 text-xl font-semibold text-app">Admin Console</h2>
            <p className="mt-1 text-xs text-muted">
              Manage results, rankings, content, and featured experiences.
            </p>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-muted transition hover:border-app hover:bg-muted hover:text-app"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <main className="flex-1 bg-app px-8 py-10">{children}</main>
    </div>
  );
}
