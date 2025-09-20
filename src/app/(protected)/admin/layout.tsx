import "server-only";
import Link from "next/link";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex">
      <aside className="w-60 border-r p-4 space-y-4">
        <h2 className="text-lg font-semibold">Admin</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/admin" className="link cursor-pointer">Dashboard</Link>
          <Link href="/admin/results" className="link cursor-pointer">Verify Results</Link>
          <Link href="/admin/ratings" className="link cursor-pointer">Star Ratings</Link>
          <Link href="/admin/standards" className="link cursor-pointer">Standards</Link> {/* NEW */}
          <Link href="/admin/featured" className="link cursor-pointer">Featured Profiles</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
