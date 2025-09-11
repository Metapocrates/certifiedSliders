export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

/** Server action: sign out via the existing server client helper */
async function signOutAction() {
  "use server";
  const supabase = supabaseServer();
  await supabase.auth.signOut();
  // no redirect here; page will re-render and header will show signed-out state
}

export default async function SiteHeader() {
  const supabase = supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  // Optional admin check
  let isAdmin = false;
  if (user) {
    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    isAdmin = !!adminRow;
  }

  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold">
          CertifiedSliders
        </Link>

        <nav className="flex items-center gap-4">
          {/* Public links */}
          <Link href="/results" className="text-sm hover:underline">
            Results
          </Link>
          <Link href="/blog" className="text-sm hover:underline">
            Blog
          </Link>

          {user ? (
            <>
              {isAdmin && (
                <Link href="/admin/results" className="text-sm hover:underline">
                  Admin
                </Link>
              )}
              <Link href="/me" className="text-sm hover:underline">
                My Profile
              </Link>
              
              <Link href="/settings" className="text-sm hover:underline">
                Settings
              </Link>
              
              <form action={signOutAction}>
                <button type="submit" className="text-sm underline">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/signin" className="text-sm underline">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
