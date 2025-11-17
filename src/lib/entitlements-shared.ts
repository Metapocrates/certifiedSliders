/**
 * Shared entitlements types and utilities (client-safe)
 *
 * These can be imported by both client and server components
 */

export type FeatureKey =
  | "csv_export_limit"
  | "analytics_enabled"
  | "see_all_athletes"
  | "priority_support";

export interface ProgramEntitlements {
  program_id: string;
  tier: number;
  features: Record<string, any>;
  expires_at: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
}

export interface FeatureCheckResult {
  enabled: boolean;
  error?: string;
}

export const TIER_NAMES = {
  0: "Free",
  1: "Premium",
  2: "Enterprise",
} as const;

export const TIER_BADGES = {
  0: { label: "Free", color: "gray" },
  1: { label: "Premium", color: "purple" },
  2: { label: "Enterprise", color: "gold" },
} as const;

/**
 * Get tier display info for UI
 */
export function getTierDisplay(tier: number): {
  name: string;
  badge: { label: string; color: string };
} {
  return {
    name: TIER_NAMES[tier as keyof typeof TIER_NAMES] || "Unknown",
    badge: TIER_BADGES[tier as keyof typeof TIER_BADGES] || { label: "Unknown", color: "gray" },
  };
}

/**
 * CLIENT-SIDE: Check if user can access a feature
 * (Requires entitlements to be passed from server component)
 */
export function canAccessFeature(
  entitlements: ProgramEntitlements | null,
  featureKey: FeatureKey
): boolean {
  if (!entitlements) return false;

  const value = entitlements.features[featureKey];

  // For boolean features
  if (typeof value === "boolean") return value;

  // For numeric features (assume enabled if > 0)
  if (typeof value === "number") return value > 0;

  // For tier-based access (if no explicit feature, check tier)
  return entitlements.tier > 0;
}
