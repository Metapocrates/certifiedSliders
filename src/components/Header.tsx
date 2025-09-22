// Server component
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";

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
      <div className="container h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Brand + always-visible "Find athletes" */}
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold tracking-tight">
              Certified Sliders
            </Link>
            <Link href="/athletes" className="text-sm hover:underline">
              Find athletes
            </Link>
          </div>

          {/* Left-side nav (blog + admin links; hidden on small screens) */}
          <nav className="hidden md:flex items-center gap-3">
            <Link href="/blog" className="text-sm hover:underline">Blog</Link>

            {admin && (
              <>
                <Link href="/admin/results" className="text-sm hover:underline">Results Queue</Link>
                <Link href="/admin/blog/new" className="text-sm hover:underline">New Post</Link>
                <Link href="/admin/home" className="text-sm hover:underline">Home Manager</Link>
              </>
            )}
          </nav>
        </div>

        {/* Right-side auth/profile */}
        {!user ? (
          <nav className="flex items-center gap-3">
            <Link href="/signin" className="btn">Sign in</Link>
          </nav>
        ) : (
          <nav className="flex items-center gap-3">
            <Link href="/submit-result" className="btn">Submit Result</Link>
            <Link href="/me" className="btn">My Profile</Link>

            <form action={signOut}>
              <button type="submit" className="btn" title="Sign out">Sign out</button>
            </form>

            <Link href="/me" className="block w-8 h-8 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {profile?.profile_pic_url ? (
                <img src={profile.profile_pic_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-xs text-muted">🙂</div>
              )}
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
