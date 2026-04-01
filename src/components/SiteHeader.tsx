// src/components/SiteHeader.tsx — Server component
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Header() {
  const supabase = await createSupabaseServer();
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

  const isParent = profile?.user_type === "parent";

  const dashboardHref =
    profile?.user_type === "ncaa_coach" ? "/coach/portal" :
    profile?.user_type === "hs_coach" ? "/hs/portal" :
    profile?.user_type === "parent" ? "/parent/dashboard" :
    admin ? "/admin/home" :
    "/me";

  const dashboardLabel =
    profile?.user_type === "ncaa_coach" ? "Coach Portal" :
    profile?.user_type === "hs_coach" ? "HS Portal" :
    profile?.user_type === "parent" ? "Parent Portal" :
    admin ? "Admin" :
    "My Profile";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between gap-4">
        {/* Logo + Primary nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-display text-xl tracking-tight">
            <span className="relative h-8 w-8">
              <Image src="/logo.svg" alt="Certified Sliders" fill sizes="32px" priority />
            </span>
            <span className="hidden sm:inline">CERTIFIED SLIDERS</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavItem href="/rankings">Rankings</NavItem>
            <NavItem href="/athletes">Athletes</NavItem>
            <NavItem href="/rated-athletes">Rated</NavItem>
            <NavItem href="/blog">Blog</NavItem>
            {admin && <NavItem href="/admin/home">Admin</NavItem>}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {!user ? (
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:brightness-110"
            >
              Sign In
            </Link>
          ) : (
            <>
              {!isParent && (
                <Link href="/submit-result" className="btn text-xs sm:text-sm">
                  Submit
                </Link>
              )}
              <Link href={dashboardHref} className="btn text-xs sm:text-sm">
                {dashboardLabel}
              </Link>
              <form action={signOut}>
                <button type="submit" className="btn text-xs sm:text-sm">
                  Sign Out
                </button>
              </form>
              <Link href={dashboardHref} title={dashboardLabel}>
                <UserAvatar src={profile?.profile_pic_url} alt="Avatar" size={32} unoptimized />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  );
}
