import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { notFound } from "next/navigation";
import DuplicateQueueClient from "./DuplicateQueueClient";

export default async function DuplicatesPage() {
  const user = await getSessionUser();
  if (!user) notFound();
  const admin = await isAdmin(user.id);
  if (!admin) notFound();

  const supabase = await createSupabaseServer();

  // Fetch pending duplicate candidates
  const { data: candidates, error } = await supabase
    .from("athlete_duplicate_candidates")
    .select("*")
    .order("confidence", { ascending: false });

  if (error) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold">Duplicate Candidates</h1>
        <p className="mt-2 text-red-600">Error: {error.message}</p>
      </div>
    );
  }

  // Collect all unique profile IDs to fetch names
  const profileIds = new Set<string>();
  for (const c of candidates ?? []) {
    profileIds.add(c.profile_id_a);
    profileIds.add(c.profile_id_b);
  }

  // Fetch profile names for display
  let profileMap: Record<string, { full_name: string; slug: string; school_name?: string; class_year?: number }> = {};
  if (profileIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, slug, school_name, class_year")
      .in("id", Array.from(profileIds));

    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = {
          full_name: p.full_name ?? "Unknown",
          slug: p.slug ?? p.id,
          school_name: p.school_name ?? undefined,
          class_year: p.class_year ?? undefined,
        };
      }
    }
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Duplicate Candidates</h1>
        <p className="text-sm text-muted mt-1">
          Review potential duplicate athlete profiles. Merge, dismiss, or mark as distinct people.
        </p>
      </div>

      <DuplicateQueueClient
        candidates={candidates ?? []}
        profileMap={profileMap}
      />
    </div>
  );
}
