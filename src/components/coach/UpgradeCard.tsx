"use client";

/**
 * Upgrade Card Component
 *
 * Shows current subscription tier and upgrade/manage buttons
 */

import { useState } from "react";
import type { ProgramEntitlements } from "@/lib/entitlements-shared";
import { getTierDisplay } from "@/lib/entitlements-shared";

interface UpgradeCardProps {
  programId: string;
  entitlements: ProgramEntitlements | null;
}

export function UpgradeCard({ programId, entitlements }: UpgradeCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tier = entitlements?.tier ?? 0;
  const { name: tierName, badge } = getTierDisplay(tier);
  const isPremium = tier >= 1;

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/coach/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program_id: programId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start checkout");
      }

      const { url } = await res.json();
      window.location.href = url; // Redirect to Stripe checkout
    } catch (err) {
      console.error("Upgrade error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/coach/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program_id: programId, action: "manage" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to open billing portal");
      }

      const { url } = await res.json();
      window.location.href = url; // Redirect to Stripe billing portal
    } catch (err) {
      console.error("Billing portal error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Subscription</h3>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                badge.color === "purple"
                  ? "bg-purple-100 text-purple-800"
                  : badge.color === "gold"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {tierName}
            </span>
          </div>
        </div>

        {!isPremium ? (
          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Upgrade to Premium"}
          </button>
        ) : (
          <button
            onClick={handleManageBilling}
            disabled={isLoading}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Manage Billing"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!isPremium && (
        <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
          <p className="text-sm font-medium text-gray-900">Premium Features:</p>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-purple-600">✓</span>
              <span>Unlimited CSV exports</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600">✓</span>
              <span>Analytics dashboard with insights</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600">✓</span>
              <span>Priority support</span>
            </li>
          </ul>
          <p className="mt-3 text-sm font-semibold text-gray-900">$49/month</p>
        </div>
      )}

      {isPremium && entitlements && (
        <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600">
            Active features:
            {entitlements.features.analytics_enabled && " Analytics"}
            {entitlements.features.csv_export_limit > 100 && " • Unlimited exports"}
            {entitlements.features.priority_support && " • Priority support"}
          </p>
        </div>
      )}
    </div>
  );
}
