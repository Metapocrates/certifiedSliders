// src/components/SiteHeader.tsx
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";
export const dynamic = "force-dynamic";


async function getIsAdmin() {
  const user = await getSessionUser();
  if (!user) return { user, isAdmin: false };
  const supabase = createSupabaseServer();
  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return { user, isAdmin: Boolean(data) };
}

export default async function SiteHeader() {
  const { user, isAdmin } = await getIsAdmin();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <Link href="/" className="font-semibold">
          Certified Sliders
        </Link>

        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link href="/rankings" className="hover:underline">Rankings</Link>
          <Link href="/submit-result" className="hover:underline">Submit Result</Link>
          <Link href="/me" className="hover:underline">Me</Link>

          {isAdmin ? (
            <Link href="/admin" className="hover:underline">Admin</Link>
          ) : null}
          {user ? (
            <form action="/auth/signout" method="post">
              <button className="hover:underline">Sign out</button>
            </form>
          ) : (
            <Link href="/signin" className="hover:underline">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
