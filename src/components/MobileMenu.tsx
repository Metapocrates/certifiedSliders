"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";

interface MobileMenuProps {
  navLinks: { href: string; label: string }[];
  user: {
    dashboardHref: string;
    dashboardLabel: string;
    isParent: boolean;
    profilePic: string | null;
  } | null;
}

export default function MobileMenu({ navLinks, user }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition hover:bg-accent"
        aria-label="Toggle menu"
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-16 z-50 border-b border-border bg-background p-4 shadow-lg">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground transition hover:bg-accent"
              >
                {link.label}
              </Link>
            ))}

            {user && (
              <>
                <div className="my-2 border-t border-border" />
                {!user.isParent && (
                  <Link
                    href="/submit-result"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground transition hover:bg-accent"
                  >
                    Submit Result
                  </Link>
                )}
                <Link
                  href={user.dashboardHref}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground transition hover:bg-accent"
                >
                  {user.dashboardLabel}
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    Sign Out
                  </button>
                </form>
              </>
            )}

            {!user && (
              <>
                <div className="my-2 border-t border-border" />
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-primary px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-primary-foreground transition hover:brightness-110"
                >
                  Sign In
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
