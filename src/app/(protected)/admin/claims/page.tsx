// src/app/(protected)/admin/claims/page.tsx
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import AdminClaimPanel from "@/components/admin/AdminClaimPanel";


export default async function AdminClaimsPage() {
  const supabase = await createSupabaseServer();
  const user = await getSessionUser();
  if (!user) notFound();
  const admin = await isAdmin(user.id);
  if (!admin) notFound();

  // All pending claims with athlete + requester info
  const { data: rows, error } = await supabase
    .from("athlete_claims")
    .select(
      "id, athlete_id, user_id, status, created_at, " +
      "athletes!inner(slug, full_name), " +
      "profiles!inner(username)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="container py-8">
        <h1 className="text-xl font-semibold">Claims</h1>
        <p className="mt-2 text-red-600">Error loading claims: {error.message}</p>
      </div>
    );
  }

  const claimsByAthlete = (rows ?? []).reduce((acc: any, r: any) => {
    const key = r.athlete_id;
    (acc[key] ??= {
      athleteId: r.athlete_id,
      slug: r.athletes?.slug,
      fullName: r.athletes?.full_name,
      claims: [],
    }).claims.push({
      id: r.id,
      user_id: r.user_id,
      status: r.status,
      created_at: r.created_at,
      requester: r.profiles?.username ?? r.user_id?.slice(0, 8),
    });
    return acc;
  }, {} as Record<string, any>);

  const groups = Object.values(claimsByAthlete) as Array<{
    athleteId: string;
    slug: string;
    fullName: string;
    claims: { id: string; user_id: string; status: string; created_at: string }[];
  }>;

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-2xl font-bold">Pending Claims</h1>

      {groups.length === 0 ? (
        <p className="opacity-70">No pending claims.</p>
      ) : (
        groups.map((g) => (
          <section key={g.athleteId} className="rounded-xl border p-4">
            <div className="mb-2">
              <a href={`/athletes/${g.slug}`} className="font-semibold hover:underline">
                {g.fullName || g.slug}
              </a>
            </div>
            <AdminClaimPanel
              slug={g.slug}
              claims={g.claims.map((c) => ({
                id: c.id,
                user_id: c.user_id,
                status: c.status,
                created_at: c.created_at,
              }))}
            />
          </section>
        ))
      )}
    </div>
  );
}
