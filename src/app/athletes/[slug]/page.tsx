import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";
import ClaimBanner from "@/components/ClaimBanner";
import AdminOffersPanel from "./AdminOffersPanel";
import InterestsSelfServe from "./InterestsSelfServe";
import ClaimControls from "./ClaimControls";

export const dynamic = "force-dynamic";
export const revalidate = 0;


type Athlete = {
  id: string;
  slug: string | null;
  full_name: string | null;
  class_year: number | null;
  gender: "M" | "F" | "X" | null;
  school_name: string | null;
  school_state: string | null;
  is_claimed: boolean;
  claim_status: "unclaimed" | "pending" | "verified" | "locked";
  external_athleticnet_id: string | null;
  claimed_user_id: string | null;
};

type InterestRow = { id: string; college_name: string; created_at: string };
type OfferRow = { id: string; college_name: string; offer_type: "interest" | "offer"; created_at: string };

export default async function AthletePage({ params }: { params: { slug: string } }) {
  const supabase = createSupabaseServer();
  const user = await getSessionUser();

  // Athlete
  const { data, error } = await supabase
    .from("athletes")
    .select(
      "id, slug, full_name, class_year, gender, school_name, school_state, is_claimed, claim_status, external_athleticnet_id, claimed_user_id"
    )
    .eq("slug", params.slug)
    .maybeSingle();

  if (error) {
    return (
      <div className="container py-8">
        <h1 className="text-xl font-semibold">Athlete</h1>
        <p className="mt-2 text-red-600">Error loading athlete: {error.message}</p>
      </div>
    );
  }

  const athlete = (data as Athlete | null) ?? null;
  if (!athlete) {
    return (
      <div className="container py-8">
        <h1 className="text-xl font-semibold">Athlete not found</h1>
      </div>
    );
  }

  // Interests
  const { data: interestsRows } = await supabase
    .from("athlete_interests")
    .select("id, college_name, created_at")
    .eq("athlete_id", athlete.id)
    .order("created_at", { ascending: false });

  // Offers
  const { data: offersRows } = await supabase
    .from("college_offers")
    .select("id, college_name, offer_type, created_at")
    .eq("athlete_id", athlete.id)
    .order("created_at", { ascending: false });

  // --- NEW: My pending claim (if signed in) ---
  let myPendingClaimId: string | null = null;
  if (user?.id) {
    const { data: myClaim } = await supabase
      .from("athlete_claims")
      .select("id")
      .eq("athlete_id", athlete.id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();
    myPendingClaimId = myClaim?.id ?? null;
  }
  // --- END NEW ---

  // Admin?
  const { data: isAdminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user?.id || "")
    .maybeSingle();
  const isAdmin = !!isAdminRow;

  // Can the viewer edit interests? (verified claimant)
  const canEditInterests =
    !!user &&
    athlete.claim_status === "verified" &&
    athlete.claimed_user_id === user.id;

  const interests = (interestsRows ?? []) as InterestRow[];
  const offers = (offersRows ?? []) as OfferRow[];

  return (
    <div className="container py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{athlete.full_name ?? "Unnamed Athlete"}</h1>
          <div className="text-sm opacity-70">
            {athlete.school_name ? (
              <>
                {athlete.school_name}
                {athlete.school_state ? `, ${athlete.school_state}` : null}
              </>
            ) : (
              "School unknown"
            )}
            {athlete.class_year ? ` • Class of ${athlete.class_year}` : null}
          </div>
        </div>
        <div className="text-xs">
          {athlete.is_claimed ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
              Claimed
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              {athlete.claim_status === "pending" ? "Claim pending" : "Unclaimed"}
            </span>
          )}
        </div>
      </header>

      <ClaimBanner
        athleteId={athlete.id}
        slug={params.slug}
        isClaimed={athlete.is_claimed}
        claimStatus={athlete.claim_status}
        signedIn={!!user}
      />

      {/* --- NEW: Claim controls section --- */}
      <section className="rounded-xl border p-4">
        <div className="text-sm font-medium mb-2">Claim this profile</div>
        <ClaimControls
          athleteId={athlete.id}
          slug={params.slug}
          myPendingClaimId={myPendingClaimId}
          signedIn={!!user}
          claimStatus={athlete.claim_status}
        />
      </section>
      {/* --- END NEW --- */}

      <section className="rounded-xl border p-4 space-y-6">
        <div>
          <div className="text-sm font-medium">Interests</div>
          <InterestsSelfServe
            athleteId={athlete.id}
            slug={params.slug}
            interests={interests}
            canEdit={canEditInterests}
          />
        </div>

        <div>
          <div className="text-sm font-medium">Offers & College Interest</div>
          {offers.length === 0 ? (
            <div className="mt-2 text-sm opacity-80">No offers yet.</div>
          ) : (
            <ul className="mt-2 space-y-1">
              {offers.map((o) => (
                <li key={o.id} className="flex items-center justify-between">
                  <span className="text-sm">
                    <span className="font-medium">{o.college_name}</span> — {o.offer_type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isAdmin && (
          <div className="pt-4 border-t">
            <AdminOffersPanel athleteId={athlete.id} />
          </div>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <div className="text-sm font-medium">Profile</div>
        <div className="mt-2 text-sm opacity-80">PRs, verified results, and more will go here.</div>
      </section>
    </div>
  );
}
