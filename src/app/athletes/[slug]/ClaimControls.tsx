"use client";

import { useTransition } from "react";
import { requestClaimAction, cancelMyClaimAction } from "@/actions/claims";

export default function ClaimControls({
  athleteId,
  slug,
  myPendingClaimId,
  signedIn,
  claimStatus,
}: {
  athleteId: string;
  slug: string;
  myPendingClaimId: string | null;
  signedIn: boolean;
  claimStatus: "unclaimed" | "pending" | "verified" | "locked";
}) {
  const [busy, start] = useTransition();

  if (claimStatus === "verified") return null;

  if (!signedIn) {
    return (
      <div className="text-sm opacity-80">
        Want to claim this profile? <a href="/login" className="underline">Sign in</a>.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {claimStatus === "unclaimed" && !myPendingClaimId && (
        <button
          className="btn"
          disabled={busy}
          onClick={() => start(() => requestClaimAction(athleteId, slug))}
        >
          Request claim
        </button>
      )}
      {myPendingClaimId && (
        <>
          <span className="text-sm">Claim pending…</span>
          <button
            className="text-sm underline"
            disabled={busy}
            onClick={() => start(() => cancelMyClaimAction(myPendingClaimId!, slug))}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
