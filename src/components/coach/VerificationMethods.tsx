"use client";

import { useState } from "react";

type VerificationMethodsProps = {
  programId: string;
  programName: string;
  programDomain: string | null;
  currentTier: number;
  signals: any;
  challenges: any[];
  userEmail: string;
};

export default function VerificationMethods({
  programId,
  programName,
  programDomain,
  currentTier,
  signals,
  challenges,
  userEmail,
}: VerificationMethodsProps) {
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [challengeType, setChallengeType] = useState<"dns" | "http" | null>(null);

  const emailMatchesDomain = programDomain && userEmail.endsWith(`@${programDomain}`);
  const hasEmailSignal = signals?.email_domain_match;
  const hasDNSSignal = signals?.dns_verified;
  const hasHTTPSignal = signals?.http_verified;
  const hasAdminSignal = signals?.admin_invited;

  async function createChallenge(method: "dns" | "http") {
    setCreatingChallenge(true);
    setChallengeType(method);

    try {
      const response = await fetch("/api/coach/create-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: programId,
          method,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create challenge");
      }

      // Refresh page to show new challenge
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setCreatingChallenge(false);
      setChallengeType(null);
    }
  }

  async function checkChallenge(challengeId: string) {
    try {
      const response = await fetch("/api/coach/check-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challengeId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Verification failed");
      }

      // Refresh page to show updated status
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "An error occurred");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Verification Methods</h2>

      {/* Email Domain Match */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">Email Domain</h3>
            <p className="text-sm text-muted-foreground">
              Sign in with your {programDomain || "school"} email
            </p>
          </div>
          {hasEmailSignal ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              ✓ Verified (+30 pts)
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              Not Verified
            </span>
          )}
        </div>

        <div className="text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Your email:</span>
            <span className="font-mono">{userEmail}</span>
          </div>
          {programDomain && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">Required domain:</span>
              <span className="font-mono">@{programDomain}</span>
            </div>
          )}
        </div>

        {!hasEmailSignal && emailMatchesDomain && (
          <div className="rounded bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
            Your email matches! Click &ldquo;Refresh Status&rdquo; above to verify.
          </div>
        )}

        {!emailMatchesDomain && programDomain && (
          <div className="rounded bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            To get +30 points, sign in with an @{programDomain} email address.
          </div>
        )}
      </div>

      {/* DNS Verification */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">DNS TXT Record</h3>
            <p className="text-sm text-muted-foreground">
              Add a TXT record to your domain to verify ownership
            </p>
          </div>
          {hasDNSSignal ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              ✓ Verified (+40 pts)
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              +40 points
            </span>
          )}
        </div>

        {!hasDNSSignal && (
          <button
            onClick={() => createChallenge("dns")}
            disabled={creatingChallenge}
            className="rounded-md px-4 py-2 bg-black text-app text-sm disabled:opacity-50"
          >
            {creatingChallenge && challengeType === "dns"
              ? "Creating..."
              : "Start DNS Verification"}
          </button>
        )}

        {/* Show pending DNS challenges */}
        {challenges
          .filter((c) => c.method === "dns" && c.status === "pending")
          .map((challenge) => (
            <div
              key={challenge.id}
              className="rounded bg-blue-50 border border-blue-200 p-4 space-y-3"
            >
              <div className="text-sm font-medium">Add this TXT record to {programDomain}:</div>
              <div className="bg-white rounded border p-3 font-mono text-xs break-all">
                certified-sliders-verify={challenge.nonce}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => checkChallenge(challenge.id)}
                  className="rounded-md px-4 py-2 bg-blue-600 text-white text-sm"
                >
                  Check DNS Record
                </button>
                <span className="text-xs text-muted-foreground self-center">
                  Expires: {new Date(challenge.expires_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
      </div>

      {/* HTTP Verification */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">HTTP Meta Tag</h3>
            <p className="text-sm text-muted-foreground">
              Add a verification file to your website
            </p>
          </div>
          {hasHTTPSignal ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              ✓ Verified (+40 pts)
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              +40 points
            </span>
          )}
        </div>

        {!hasHTTPSignal && (
          <button
            onClick={() => createChallenge("http")}
            disabled={creatingChallenge}
            className="rounded-md px-4 py-2 bg-black text-app text-sm disabled:opacity-50"
          >
            {creatingChallenge && challengeType === "http"
              ? "Creating..."
              : "Start HTTP Verification"}
          </button>
        )}

        {/* Show pending HTTP challenges */}
        {challenges
          .filter((c) => c.method === "http" && c.status === "pending")
          .map((challenge) => (
            <div
              key={challenge.id}
              className="rounded bg-blue-50 border border-blue-200 p-4 space-y-3"
            >
              <div className="text-sm font-medium">
                Upload this file to your website:
              </div>
              <div className="bg-white rounded border p-3 space-y-2">
                <div className="text-xs font-medium">Path:</div>
                <div className="font-mono text-xs break-all">
                  https://{programDomain}/.well-known/certified-sliders-verify.txt
                </div>
                <div className="text-xs font-medium mt-2">Content:</div>
                <div className="font-mono text-xs break-all">{challenge.nonce}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => checkChallenge(challenge.id)}
                  className="rounded-md px-4 py-2 bg-blue-600 text-white text-sm"
                >
                  Check Verification File
                </button>
                <span className="text-xs text-muted-foreground self-center">
                  Expires: {new Date(challenge.expires_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
      </div>

      {/* Admin Invitation */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">Admin Invitation</h3>
            <p className="text-sm text-muted-foreground">
              Request verification from a Certified Sliders administrator
            </p>
          </div>
          {hasAdminSignal ? (
            <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
              ✓ Admin Verified (+70 pts)
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              +70 points
            </span>
          )}
        </div>

        {!hasAdminSignal && (
          <div className="text-sm text-muted-foreground">
            Contact support@certifiedsliders.com with your program affiliation details.
          </div>
        )}
      </div>
    </div>
  );
}
