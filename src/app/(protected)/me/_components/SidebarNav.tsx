"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarNavProps = {
  profileId: string | null;
};

export default function SidebarNav({ profileId }: SidebarNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/me", label: "Dashboard", exact: true },
    { href: "/me/edit", label: "Edit Profile Details" },
    { href: "/me/share-with-coaches", label: "Share with Coaches" },
    ...(profileId ? [{ href: `/athletes/${profileId}`, label: "View Public Page", external: true }] : []),
    { href: "/me/events", label: "Events To Display" },
  ];

  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname?.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg border px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "border-app bg-muted text-app"
                : "border-transparent text-muted hover:border-app hover:bg-muted hover:text-app"
            }`}
            {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {item.label}
            {item.external && " →"}
          </Link>
        );
      })}
    </nav>
  );
}
