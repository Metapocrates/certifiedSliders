/**
 * Portal Constants - Single source of truth for all portal definitions
 *
 * Used for:
 * - Navigation routing
 * - Admin testing/preview mode
 * - UI signposting (badges, themes)
 * - Authorization checks
 */

export type PortalKey = "ATHLETE" | "NCAA_COACH" | "HS_COACH" | "PARENT";

export interface PortalConfig {
  key: PortalKey;
  label: string;
  shortLabel: string;
  basePath: string;
  // UI signposting
  accentColor: string; // Tailwind color class base (e.g., "blue" for blue-500)
  badgeClass: string; // Full Tailwind classes for badge
  bannerClass: string; // Full Tailwind classes for banner
  icon: string; // Icon name or emoji
  // Role mapping
  roleKey: "athlete" | "ncaa_coach" | "hs_coach" | "parent";
  // Status
  status: "active" | "beta" | "coming_soon";
}

export const PORTALS: Record<PortalKey, PortalConfig> = {
  ATHLETE: {
    key: "ATHLETE",
    label: "Athlete Portal",
    shortLabel: "Athlete",
    basePath: "/me",
    accentColor: "scarlet",
    badgeClass: "bg-scarlet/10 text-scarlet border-scarlet/20",
    bannerClass: "bg-scarlet/5 border-scarlet/20 text-scarlet",
    icon: "running",
    roleKey: "athlete",
    status: "active",
  },
  NCAA_COACH: {
    key: "NCAA_COACH",
    label: "NCAA Coach Portal",
    shortLabel: "NCAA Coach",
    basePath: "/coach/portal",
    accentColor: "blue",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    bannerClass: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
    icon: "clipboard",
    roleKey: "ncaa_coach",
    status: "beta",
  },
  HS_COACH: {
    key: "HS_COACH",
    label: "HS Coach Portal",
    shortLabel: "HS Coach",
    basePath: "/hs-coach",
    accentColor: "emerald",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    bannerClass: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300",
    icon: "whistle",
    roleKey: "hs_coach",
    status: "active",
  },
  PARENT: {
    key: "PARENT",
    label: "Parent Portal",
    shortLabel: "Parent",
    basePath: "/parent/dashboard",
    accentColor: "purple",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    bannerClass: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300",
    icon: "family",
    roleKey: "parent",
    status: "beta",
  },
};

/**
 * Get portal config from a role key
 */
export function getPortalForRole(roleKey: string): PortalConfig | null {
  const portal = Object.values(PORTALS).find((p) => p.roleKey === roleKey);
  return portal || null;
}

/**
 * Get portal config from a base path
 */
export function getPortalForPath(pathname: string): PortalConfig | null {
  // Check exact matches first
  for (const portal of Object.values(PORTALS)) {
    if (pathname === portal.basePath || pathname.startsWith(portal.basePath + "/")) {
      return portal;
    }
  }

  // Check broader path prefixes
  if (pathname.startsWith("/coach")) {
    return PORTALS.NCAA_COACH;
  }
  if (pathname.startsWith("/hs")) {
    return PORTALS.HS_COACH;
  }
  if (pathname.startsWith("/parent")) {
    return PORTALS.PARENT;
  }
  if (pathname.startsWith("/me") || pathname.startsWith("/athlete")) {
    return PORTALS.ATHLETE;
  }

  return null;
}

/**
 * All portal keys as an array
 */
export const PORTAL_KEYS = Object.keys(PORTALS) as PortalKey[];

/**
 * Admin preview mode types
 */
export type AdminPreviewMode = "normal" | "portal_override" | "impersonation";

export interface AdminPreviewState {
  mode: AdminPreviewMode;
  portalKey: PortalKey | null;
  impersonatedUserId: string | null;
  impersonatedUserName: string | null;
  enabled: boolean;
  updatedAt: string | null;
}

export const DEFAULT_ADMIN_PREVIEW_STATE: AdminPreviewState = {
  mode: "normal",
  portalKey: null,
  impersonatedUserId: null,
  impersonatedUserName: null,
  enabled: false,
  updatedAt: null,
};

/**
 * Cookie name for admin preview state
 */
export const ADMIN_PREVIEW_COOKIE = "cs_admin_preview";

/**
 * Environment flag for impersonation (must be explicitly enabled)
 */
export const IMPERSONATION_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_ADMIN_IMPERSONATION === "true" ||
  process.env.NODE_ENV === "development";
