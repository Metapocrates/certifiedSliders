// src/components/Header.tsx
// Server component

import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import ThemeToggle from "@/components/ThemeToggle";
import Image from "next/image";


export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Header() {
  const supabase = createSupabaseServer();
  const user = await getSessionUser();
  const admin = user ? await isAdmin(user.id) : false;

  let profile:
    | { username: string | null; profile_pic_url: string | null }
    | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, profile_pic_url")
      .eq("id", user.id)
      .maybeSingle();
    profile = data ?? null;
  }

  return (
    <header className="border-b bg-card">
      <div className="container h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {/* Brand only */}
          <Link href="/" className="font-semibold tracking-tight">
            Certified Sliders
          </Link>

          {/* Left-side nav (always visible) */}
          <nav className="flex items-center gap-3">
            <Link href="/blog" className="text-sm hover:underline">Blog</Link>
            <Link href="/athletes" className="text-sm hover:underline">Find athletes</Link>
            {/* ✅ New: public Rankings link */}
            <Link href="/rankings" className="text-sm hover:underline">Rankings</Link>

            {admin && (
              <>
                <Link href="/admin/results" className="text-sm hover:underline">Results Queue</Link>
                <Link href="/admin/blog/new" className="text-sm hover:underline">New Post</Link>
                <Link href="/admin/home" className="text-sm hover:underline">Home Manager</Link>
              </>
            )}
          </nav>
        </div>

        {/* Right-side auth/profile + theme */}
        <nav className="flex items-center gap-3">
          <ThemeToggle /> {/* toggle shows in prod */}

          {!user ? (
            <Link href="/login" className="btn">Sign in</Link>
          ) : (
            <>
              {/* Submit Result (only when signed in) */}
              <Link href="/submit-result" className="btn">Submit Result</Link>

              <Link href="/me" className="btn">My Profile</Link>

              <form action={signOut}>
                <button type="submit" className="btn" title="Sign out">Sign out</button>
              </form>

              <Link
                href="/me"
                className="block w-8 h-8 rounded-full overflow-hidden bg-gray-100 relative"
                title="My profile"
              >
                <Image
                  src={profile?.profile_pic_url ?? "/avatar-placeholder.png"}
                  alt="Avatar"
                  fill
                  sizes="32px"
                  className="object-cover"
                  unoptimized
                />
              </Link>

            </>
          )}
        </nav>
      </div>
    </header>
  );
}
