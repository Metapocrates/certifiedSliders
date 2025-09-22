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
  return (
    <div className="flex">
      <aside className="w-60 border-r p-4 space-y-4">
        <h2 className="text-lg font-semibold">Admin</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/admin" className="link cursor-pointer">Dashboard</Link>
          <Link href="/admin/results" className="link cursor-pointer">Verify Results</Link>
          <Link href="/admin/ratings" className="link cursor-pointer">Star Ratings</Link>
          <Link href="/admin/standards" className="link cursor-pointer">Standards</Link>
          <Link href="/admin/featured" className="link cursor-pointer">Featured Profiles</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
