// src/components/SiteHeader.tsx — Server component
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";
import MobileMenu from "@/components/MobileMenu";

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

  const navLinks = [
    { href: "/rankings", label: "Rankings" },
    { href: "/athletes", label: "Athletes" },
    { href: "/rated-athletes", label: "Rated" },
    { href: "/blog", label: "Blog" },
    ...(admin ? [{ href: "/admin/home", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="relative h-9 w-9">
            <Image src="/logo.svg" alt="Certified Sliders" fill sizes="36px" priority />
          </span>
          <span className="hidden font-display text-lg tracking-tight text-foreground sm:inline">
            CERTIFIED SLIDERS
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {!user ? (
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition hover:brightness-110"
            >
              Sign In
            </Link>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              {!isParent && (
                <Link
                  href="/submit-result"
                  className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition hover:bg-accent"
                >
                  Submit
                </Link>
              )}
              <Link
                href={dashboardHref}
                className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition hover:bg-accent"
              >
                {dashboardLabel}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  Sign Out
                </button>
              </form>
              <Link href={dashboardHref} title={dashboardLabel}>
                <UserAvatar src={profile?.profile_pic_url} alt="Avatar" size={32} unoptimized />
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <MobileMenu
            navLinks={navLinks}
            user={user ? { dashboardHref, dashboardLabel, isParent, profilePic: profile?.profile_pic_url ?? null } : null}
          />
        </div>
      </div>
    </header>
  );
}
