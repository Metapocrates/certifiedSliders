/**
 * Entitlements and feature gating helpers (SERVER-SIDE ONLY)
 *
 * Use these to check if a program has access to premium features
 * Import from @/lib/entitlements-shared for client components
 */

import { createSupabaseServer } from "@/lib/supabase/compat";
import type { FeatureKey, ProgramEntitlements, FeatureCheckResult } from "@/lib/entitlements-shared";

// Re-export shared types and utilities
export type { FeatureKey, ProgramEntitlements, FeatureCheckResult };
export {
  TIER_NAMES,
  TIER_BADGES,
  getTierDisplay,
  canAccessFeature,
} from "@/lib/entitlements-shared";

/**
 * SERVER-SIDE: Get program entitlements from database
 */
export async function getProgramEntitlements(
  programId: string
): Promise<ProgramEntitlements | null> {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("program_entitlements")
    .select("*")
    .eq("program_id", programId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch program entitlements:", error);
    return null;
  }

  return data;
}

/**
 * SERVER-SIDE: Check if a specific feature is enabled for a program
 */
export async function isFeatureEnabledServer(
  programId: string,
  featureKey: FeatureKey
): Promise<boolean> {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase.rpc("is_feature_enabled", {
    _program_id: programId,
    _feature_key: featureKey,
  });

  if (error) {
    console.error("Failed to check feature:", error);
    return false;
  }

  return data ?? false;
}

/**
 * SERVER-SIDE: Get CSV export limit for a program
 */
export async function getCsvExportLimitServer(programId: string): Promise<number> {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase.rpc("get_csv_export_limit", {
    _program_id: programId,
  });

  if (error) {
    console.error("Failed to get CSV export limit:", error);
    return 10; // Default to free tier limit
  }

  return data ?? 10;
}

/**
 * SERVER-SIDE: Check if a program is on premium tier (tier >= 1)
 */
export async function isPremiumProgram(programId: string): Promise<boolean> {
  const entitlements = await getProgramEntitlements(programId);
  return (entitlements?.tier ?? 0) >= 1;
}
