// src/app/(protected)/admin/featured/page.tsx
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import FeaturedForm from "./FeaturedForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Candidate = {
  id: string;
  username: string | null;
  full_name: string | null;
  star_rating: number | null;
  featured: boolean | null;
};

type FeaturedListRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  star_rating: number | null;
};

export default async function FeaturedAdminPage() {
  const supabase = createSupabaseServer();

  // Viewer + Admin check
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;

  let isAdmin = false;
  if (user?.id) {
    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    isAdmin = !!adminRow?.user_id;
  }

  if (!user) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-3">Featured Profiles (Admin)</h1>
        <div className="rounded-lg border px-3 py-2 text-sm text-red-700 bg-red-50">
          You must be signed in.
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-3">Featured Profiles (Admin)</h1>
        <div className="rounded-lg border px-3 py-2 text-sm text-red-700 bg-red-50">
          You do not have permission to view this page.
        </div>
      </div>
    );
  }

  // All athletes available to feature (homepage will filter to 3-5 stars for display)
  const { data: candidates, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, star_rating, featured")
    .order("star_rating", { ascending: false, nullsFirst: false })
    .order("username", { ascending: true })
    .limit(500);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Featured Profiles (Admin)</h1>
        <Link
          href="/admin"
          className="rounded-md border px-3 py-2 text-sm hover:opacity-90"
        >
          Back to Admin
        </Link>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-medium mb-1">How featuring works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>You can mark <strong>any athlete</strong> as featured here</li>
          <li>The homepage carousel will show: manually featured athletes + random selection from 3-5 stars</li>
          <li>Only 3-5 star athletes appear on the homepage (even if lower-rated athletes are marked featured)</li>
        </ul>
      </div>

      {error ? (
        <div className="rounded-lg border px-3 py-2 text-sm text-red-700 bg-red-50">
          Failed to load athletes: {error.message}
        </div>
      ) : null}

      <FeaturedForm candidates={(candidates as Candidate[] | null) ?? []} />

      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-medium">Currently Featured</h2>
          <FeaturedCount />
        </div>
        <div className="p-4">
          <FeaturedList />
        </div>
      </div>
    </div>
  );
}

async function FeaturedCount() {
  const supabase = createSupabaseServer();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("featured", true);
  return <span className="text-sm text-gray-500">{count ?? 0} athletes</span>;
}

async function FeaturedList() {
  const supabase = createSupabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name, star_rating")
    .eq("featured", true)
    .order("star_rating", { ascending: false, nullsFirst: false })
    .order("username", { ascending: true })
    .limit(100);

  const rows = (data ?? []) as FeaturedListRow[];

  if (!rows.length) {
    return <div className="text-sm text-gray-600">No featured athletes yet.</div>;
  }

  return (
    <ul className="list-disc pl-5 space-y-1 text-sm">
      {rows.map((p) => (
        <li key={p.id}>
          <Link href={p.username ? `/athletes/${p.username}` : "#"} className="hover:underline">
            {p.username || p.full_name || p.id.slice(0, 8)}
          </Link>{" "}
          • {p.full_name || "No name"} • {p.star_rating ?? 0}★
        </li>
      ))}
    </ul>
  );
}
