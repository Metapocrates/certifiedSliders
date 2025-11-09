"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type ClaimState =
  | { status: "pending" }
  | { status: "success" }
  | { status: "error"; message: string };

export default function ClaimPage({ params }: { params: { token: string } }) {
  const [state, setState] = useState<ClaimState>({ status: "pending" });

  // The token param is actually the row ID now (short UUID)
  const rowId = params.token;

  useEffect(() => {
    let cancelled = false;
    async function submitClaim() {
      try {
        const res = await fetch("/api/verification/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ row_id: rowId }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data?.ok) {
          setState({ status: "success" });
          setTimeout(() => {
            window.location.href = "/me/edit?claimed=1";
          }, 1500);
        } else {
          setState({
            status: "error",
            message: data?.error ?? "We couldn't verify that link. Generate a fresh link from Edit Profile and try again.",
          });
        }
      } catch (err: any) {
        if (cancelled) return;
        setState({
          status: "error",
          message: err?.message ?? "Unexpected error. Generate a fresh link from Edit Profile and try again.",
        });
      }
    }

    submitClaim();
    return () => {
      cancelled = true;
    };
  }, [rowId]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center gap-6 px-6 py-16 text-center">
      <div>
        <h1 className="text-3xl font-semibold text-app">Verifying Athletic.net link…</h1>
        <p className="mt-2 text-sm text-muted">
          Keep this tab open. We'll redirect you back to your profile editor once verification completes.
        </p>
      </div>

      <div className="rounded-3xl border border-app bg-card p-6 shadow-lg">
        {state.status === "pending" && (
          <p className="text-sm text-muted">
            Checking your claim link. If nothing happens after a few seconds, press the button below.
          </p>
        )}
        {state.status === "success" && (
          <p className="text-sm font-semibold text-green-600">
            Verified! Redirecting you back to your profile editor…
          </p>
        )}
        {state.status === "error" && (
          <p className="text-sm text-scarlet">
            {state.message}
          </p>
        )}

        <form
          action="/api/verification/claim"
          method="POST"
          className="mt-5 flex flex-col gap-3"
          onSubmit={(e) => {
            setState({ status: "pending" });
          }}
        >
          <input type="hidden" name="row_id" value={rowId} />
          <button
            type="submit"
            className="rounded-full bg-scarlet px-4 py-2 text-sm font-semibold text-white transition hover:bg-scarlet/90"
          >
            Verify now
          </button>
          <p className="text-xs text-muted">
            If you see an error, go back to Certified Sliders &gt; Edit Profile &gt; Athletic.net profiles and generate a new claim link.
          </p>
        </form>
      </div>
    </div>
  );
}
