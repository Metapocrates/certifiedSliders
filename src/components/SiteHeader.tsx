"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function SiteHeader({
  isAdmin = false,
  signedIn = false,
}: {
  isAdmin?: boolean;
  signedIn?: boolean;
}) {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    pathname === href ? "text-scarlet" : "text-ink-muted hover:text-ink";

  return (
    <header className="sticky top-0 z-50 border-b border-app bg-app/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-wide">
          <span className="text-ink text-xl">CERTIFIED</span>
          <span className="text-scarlet text-xl">SLIDERS</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/submit-result" className={linkClass("/submit-result")}>
            Submit Result
          </Link>
          <Link href="/rankings" className={linkClass("/rankings")}>
            Rankings
          </Link>
          <Link href="/me" className={linkClass("/me")}>
            Me
          </Link>
          {isAdmin && (
            <Link href="/admin" className={linkClass("/admin")}>
              Admin
            </Link>
          )}
          {signedIn ? (
            <Link href="/signout" className="text-ink-muted hover:text-ink">
              Sign out
            </Link>
          ) : (
            <Link href="/signin" className="text-ink-muted hover:text-ink">
              Sign in
            </Link>
          )}
          <nav className="flex items-center gap-4 text-sm font-medium">
  {/* ...your existing links... */}
  <ThemeToggle />
</nav>

        </nav>
      </div>
    </header>
  );
}
