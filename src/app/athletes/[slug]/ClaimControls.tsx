"use client";
import { useTransition, useState } from "react";
import { requestClaimAction, cancelMyClaimAction } from "@/actions/claims";

export default function ClaimControls(props: {
  athleteId: string; slug: string; myPendingClaimId: string | null;
  signedIn: boolean; claimStatus: "unclaimed" | "pending" | "verified" | "locked";
}) {
  const { athleteId, slug, myPendingClaimId, signedIn, claimStatus } = props;
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (claimStatus === "verified") return null;
  if (!signedIn) {
    return <div className="text-sm opacity-80">
      Want to claim this profile? <a href="/login" className="underline">Sign in</a>.
    </div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {claimStatus === "unclaimed" && !myPendingClaimId && (
          <button
            className="btn"
            disabled={busy}
            onClick={() =>
              start(async () => {
                setErr(null);
                try { await requestClaimAction(athleteId, slug); }
                catch (e: any) { setErr(e?.message ?? "Failed to request claim"); }
              })
            }
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
              onClick={() =>
                start(async () => {
                  setErr(null);
                  try { await cancelMyClaimAction(myPendingClaimId!, slug); }
                  catch (e: any) { setErr(e?.message ?? "Failed to cancel"); }
                })
              }
            >
              Cancel
            </button>
          </>
        )}
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  );
}
