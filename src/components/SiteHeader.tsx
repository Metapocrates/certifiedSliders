// src/components/Header.tsx
// Server component

import Link from "next/link";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NAV_LINK_CLASSES =
  "text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm px-1.5 py-1";

export default async function Header() {
  const supabase = createSupabaseServer();
  const user = await getSessionUser();
  const admin = user ? await isAdmin(user.id) : false;

  let profile:
    | { username: string | null; profile_pic_url: string | null; user_type: string | null }
    | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, profile_pic_url, user_type")
      .eq("id", user.id)
      .maybeSingle();
    profile = data ?? null;
  }

  // Determine submit result URL based on user type
  const submitResultHref = profile?.user_type === 'parent'
    ? '/parent/submissions/new'
    : '/submit-result';

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex flex-wrap items-center justify-between gap-3 py-2 sm:py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight text-base sm:text-lg"
          >
            <span className="relative h-8 w-8 sm:h-9 sm:w-9">
              <Image src="/logo.svg" alt="Certified Sliders" fill sizes="36px" priority />
            </span>
            <span className="hidden sm:inline">Certified Sliders</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href="/blog" className={NAV_LINK_CLASSES}>
              Blog
            </Link>
            <Link href="/athletes" className={NAV_LINK_CLASSES}>
              Find athletes
            </Link>
            <Link href="/rankings" className={NAV_LINK_CLASSES}>
              Rankings
            </Link>

            {admin && (
              <>
                <Link href="/admin/home" className={NAV_LINK_CLASSES}>
                  Home Manager
                </Link>
              </>
            )}
          </nav>
        </div>

        <nav className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
          <ThemeToggle />

          {!user ? (
            <Link href="/login" className="btn whitespace-nowrap">
              Sign in
            </Link>
          ) : (
            <>
              <Link
                href={submitResultHref}
                className="btn whitespace-nowrap text-xs sm:text-sm"
              >
                Submit Result
              </Link>

              <Link href="/me" className="btn whitespace-nowrap text-xs sm:text-sm">
                My Profile
              </Link>

              <form action={signOut}>
                <button
                  type="submit"
                  className="btn whitespace-nowrap text-xs sm:text-sm"
                  title="Sign out"
                >
                  Sign out
                </button>
              </form>

              <Link
                href="/me"
                className="relative block h-8 w-8 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
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
