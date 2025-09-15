"use client";

import Link from "next/link";
import Image from "next/image";
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
        {/* Brand: logo links to home */}
        <Link href="/" className="flex items-center gap-2" aria-label="Certified Sliders home">
          <Image
            src="/brand/logo.png"
            alt="Certified Sliders"
            width={140}
            height={40}
            priority
            className="h-8 w-auto"
          />
          <span className="sr-only">Certified Sliders</span>
        </Link>

        {/* Primary nav + actions */}
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
          {/* Theme toggle at the end */}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
