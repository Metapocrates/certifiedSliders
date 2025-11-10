/**
 * Entitlements & Feature Flags Helper
 * Check if features are enabled for a program
 */

export interface FeatureCheckResult {
  enabled: boolean;
  error?: string;
}

/**
 * Check if a feature is enabled for a program
 * @param featureKey - Feature key (e.g., 'analytics_enabled', 'csv_export_limit')
 * @param programId - Program UUID
 * @returns Feature enabled status
 */
export async function isFeatureEnabled(
  featureKey: string,
  programId: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/coach/feature?program=${encodeURIComponent(programId)}&key=${encodeURIComponent(featureKey)}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      console.error(`Feature check failed: ${res.status}`);
      return false;
    }

    const data: FeatureCheckResult = await res.json();
    return data.enabled;
  } catch (error) {
    console.error("Feature check error:", error);
    return false;
  }
}

/**
 * Get the CSV export limit for a program
 * @param programId - Program UUID
 * @returns CSV export row limit (default 10 for free tier)
 */
export async function getCsvExportLimit(programId: string): Promise<number> {
  try {
    const res = await fetch(`/api/coach/csv-limit?program=${encodeURIComponent(programId)}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return 10; // Default to free tier limit
    }

    const data = await res.json();
    return data.limit || 10;
  } catch (error) {
    console.error("CSV limit check error:", error);
    return 10;
  }
}
