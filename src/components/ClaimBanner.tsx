import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

type Props = {
  athleteId: string;
  slug: string;
  isClaimed: boolean;
  claimStatus: "unclaimed" | "pending" | "verified" | "locked";
  signedIn?: boolean;
};

export default async function ClaimBanner({
  athleteId,
  slug,
  isClaimed,
  claimStatus,
}: Props) {
  // Server Action: create a claim
  async function requestClaim() {
    "use server";
    const supabase = await createSupabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If not signed in, go to login and return to this athlete page after
    if (!user) {
      redirect(`/login?next=/athletes/${slug}`);
    }

    // Call your RPC to create a claim
    const { error } = await supabase.rpc("request_claim", {
      p_athlete_id: athleteId,
    });
    if (error) {
      // Surface readable error in dev; you can swap to a toast UI later
      console.error("request_claim failed:", error.message);
    }

    // Refresh the queue + this page so the status chip updates
    revalidatePath(`/admin/claims`);
    revalidatePath(`/athletes/${slug}`);
  }

  // Already fully claimed — no banner
  if (isClaimed) return null;

  // Pending state — read-only notice
  if (claimStatus === "pending") {
    return (
      <div className="rounded-xl border bg-amber-50 p-4 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
        <div className="text-sm font-medium">Claim pending</div>
        <div className="text-xs opacity-80">
          We’re verifying your ownership. You’ll be notified if we need more information.
        </div>
      </div>
    );
  }

  // Unclaimed/verified-but-not-locked → show claim CTA
  return (
    <form action={requestClaim}>
      <div className="flex items-center justify-between rounded-xl border p-4">
        <div className="text-sm">
          Is this your profile?{" "}
          <span className="opacity-70">Claim it to manage results and settings.</span>
        </div>
        <button className="rounded bg-black px-4 py-2 text-white">
          Claim this profile
        </button>
      </div>
    </form>
  );
}
