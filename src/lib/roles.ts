/**
 * Role-based access control utilities
 *
 * Determines user roles and provides routing/access helpers
 */

import { createSupabaseServer } from "@/lib/supabase/compat";
import { redirect } from "next/navigation";

export type UserRole = "athlete" | "hs_coach" | "ncaa_coach" | "parent" | "admin";

export interface UserRoleInfo {
  primaryRole: UserRole;
  availableRoles: UserRole[];
  defaultRoute: string;
}

/**
 * Get user's primary role and available roles
 * SERVER-SIDE ONLY
 */
export async function getUserRole(userId?: string): Promise<UserRoleInfo | null> {
  const supabase = await createSupabaseServer();

  // Get current user if not provided
  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    targetUserId = user.id;
  }

  // Get profile with role preference
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type, role_preference, default_home_route")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!profile) return null;

  const availableRoles: UserRole[] = [];

  // Check if admin
  const { data: adminData } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (adminData) {
    availableRoles.push("admin");
  }

  // Primary role from user_type
  const primaryType = profile.user_type as UserRole | null;
  if (primaryType) {
    availableRoles.push(primaryType);
  }

  // Check for NCAA coach role (via program_memberships)
  if (primaryType !== "ncaa_coach") {
    const { data: programMembership } = await supabase
      .from("program_memberships")
      .select("id")
      .eq("user_id", targetUserId)
      .limit(1)
      .maybeSingle();

    if (programMembership) {
      availableRoles.push("ncaa_coach");
    }
  }

  // Check for HS coach role (via hs_staff)
  if (primaryType !== "hs_coach") {
    const { data: hsStaff } = await supabase
      .from("hs_staff")
      .select("id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (hsStaff) {
      availableRoles.push("hs_coach");
    }
  }

  // Check for parent role (via parent_links)
  if (primaryType !== "parent") {
    const { data: parentLink } = await supabase
      .from("parent_links")
      .select("id")
      .eq("parent_user_id", targetUserId)
      .eq("status", "accepted")
      .limit(1)
      .maybeSingle();

    if (parentLink) {
      availableRoles.push("parent");
    }
  }

  // Determine primary role (preference > user_type > first available)
  let primaryRole: UserRole;
  if (profile.role_preference && availableRoles.includes(profile.role_preference as UserRole)) {
    primaryRole = profile.role_preference as UserRole;
  } else if (primaryType && availableRoles.includes(primaryType)) {
    primaryRole = primaryType;
  } else if (availableRoles.length > 0) {
    primaryRole = availableRoles[0];
  } else {
    // Default to athlete if no roles found
    primaryRole = "athlete";
    availableRoles.push("athlete");
  }

  // Determine default route
  const defaultRoute = profile.default_home_route || getDefaultRouteForRole(primaryRole);

  return {
    primaryRole,
    availableRoles,
    defaultRoute,
  };
}

/**
 * Get default route for a given role
 */
export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case "athlete":
      return "/me"; // Athlete dashboard - fully functional
    case "hs_coach":
      return "/hs-coach"; // HS Coach coming soon page
    case "ncaa_coach":
      return "/ncaa-coach"; // NCAA Coach coming soon page
    case "parent":
      return "/parent/dashboard"; // Parent portal dashboard
    case "admin":
      return "/admin"; // Admin dashboard - fully functional
    default:
      return "/me"; // Default to athlete dashboard
  }
}

/**
 * Require a specific role (redirect if not authorized)
 * SERVER-SIDE ONLY - Use in Server Components
 */
export async function requireRole(
  allowedRoles: UserRole | UserRole[],
  redirectTo = "/login"
): Promise<UserRoleInfo> {
  const roleInfo = await getUserRole();

  if (!roleInfo) {
    redirect(redirectTo);
  }

  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  // Check if user has any of the allowed roles
  const hasAccess = roleInfo.availableRoles.some((role) => allowed.includes(role));

  if (!hasAccess) {
    // Redirect to their default dashboard instead of login
    redirect(roleInfo.defaultRoute);
  }

  return roleInfo;
}

/**
 * Check if user has a specific role (doesn't redirect)
 * SERVER-SIDE ONLY
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const roleInfo = await getUserRole();
  return roleInfo?.availableRoles.includes(role) ?? false;
}

/**
 * Check if user is admin
 * SERVER-SIDE ONLY
 */
export async function isAdminUser(): Promise<boolean> {
  return await hasRole("admin");
}
