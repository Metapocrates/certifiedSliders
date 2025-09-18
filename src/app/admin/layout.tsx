import "server-only";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) redirect("/");

  return (
    <div className="flex">
      <aside className="w-60 border-r p-4 space-y-4">
        <h2 className="text-lg font-semibold">Admin</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/admin/ratings">Star Ratings</Link>
          <Link href="/admin/featured">Featured Profiles</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
