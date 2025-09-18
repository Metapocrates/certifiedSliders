import Link from "next/link";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <aside className="w-60 border-r p-4 space-y-4">
        <h2 className="text-lg font-semibold">Admin</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/admin/ratings">Star Ratings</Link>
          <Link href="/admin/featured">Featured Profiles</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
