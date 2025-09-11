export const dynamic = "force-dynamic";

import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseServer } from "@/lib/supabase/server";

/** Server action: sign out and refresh cookies correctly */
async function signOutAction() {
  "use server";

  const cookieStore = cookies();
  const get = (name: string) => cookieStore.get(name)?.value;
  const set = (name: string, value: string, options: CookieOptions) => {
    cookieStore.set({ name, value, ...options });
  };
  const remove = (name: string, options: CookieOptions) => {
    cookieStore.set({ name, value: "", ...options, maxAge: 0 });
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createServerClient(url, anon, { cookies: { get, set, remove } });

  await supabase.auth.signOut();
  // no redirect here; the page will reload and header will re-render as signed-out
}

export default async function SiteHeader() {
  const {
    data: { session },
  } = await supabaseServer().auth.getSession();

  const user = session?.user;

  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold">
          CertifiedSliders
        </Link>

        <nav className="flex items-center gap-3">
          {/* Put any public links here */}
          <Link href="/results" className="text-sm hover:underline">
            Results
          </Link>

          {user ? (
            <>
              <Link href="/me" className="text-sm hover:underline">
                My Profile
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
