import "server-only";
import Link from "next/link";
import SignOutButtonClient from "./SignOutButtonClient";
import { supabaseServer } from "../lib/supabase/server";

export default async function SiteHeader() {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    isAdmin = !!adminRow;
  }

  return (
    <header className="border-b">
      <div className="mx-auto max-w-6xl p-4 flex items-center justify-between">
        <Link href="/" className="font-semibold">Certified Sliders</Link>

        <nav className="flex items-center gap-3">
          {isAdmin && (
            <Link href="/admin/ratings" className="rounded border px-3 py-1.5">
              Admin
            </Link>
          )}

          {!user ? (
            <Link href="/login" className="rounded bg-black px-3 py-1.5 text-white">
              Sign in
            </Link>
          ) : (
            <SignOutButtonClient />
          )}
        </nav>
      </div>
    </header>
  );
}
