// src/app/(protected)/admin/featured/page.tsx
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { setFeaturedAction } from "./actions";

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

  // 3–5★ candidates only (DB policy should also enforce)
  const { data: candidates, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, star_rating, featured")
    .gte("star_rating", 3)
    .order("star_rating", { ascending: false })
    .order("username", { ascending: true })
    .limit(200);

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

      <p className="text-sm text-gray-600">
        Only athletes with <strong>3–5★</strong> can be marked as Featured. The database
        enforces this rule.
      </p>

      {error ? (
        <div className="rounded-lg border px-3 py-2 text-sm text-red-700 bg-red-50">
          Failed to load athletes: {error.message}
        </div>
      ) : null}

      <form action={setFeaturedAction} className="rounded-lg border p-4 space-y-3 bg-white">
        <div>
          <label className="block text-sm font-medium mb-1">Athlete</label>
          <select name="athleteId" className="w-full rounded-md border px-3 py-2 text-sm" required>
            <option value="">— Select athlete —</option>
            {(candidates as Candidate[] | null)?.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.username || "no-username")} • {(p.full_name || "No name")} • {(p.star_rating ?? 0)}★ • currently:{" "}
                {p.featured ? "Featured" : "Not featured"}
              </option>
            )) || null}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Featured status</label>
          <select name="featured" className="w-full rounded-md border px-3 py-2 text-sm" defaultValue="false">
            <option value="false">Not featured</option>
            <option value="true">Featured</option>
          </select>
        </div>

        <button
          className="rounded-md bg-black text-white px-3 py-2 text-sm hover:opacity-90"
          type="submit"
        >
          Save
        </button>
      </form>

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
    .order("star_rating", { ascending: false })
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
