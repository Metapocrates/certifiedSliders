/**
 * Server-side impersonation helper
 *
 * Allows admins to impersonate other users for testing purposes.
 * The impersonation state is stored in a cookie and checked server-side.
 */

import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/compat";
import {
  ADMIN_PREVIEW_COOKIE,
  type AdminPreviewState,
  DEFAULT_ADMIN_PREVIEW_STATE,
} from "@/lib/portals/constants";

export interface EffectiveUser {
  /** The effective user ID (impersonated user if active, otherwise real user) */
  id: string;
  /** The real authenticated user ID */
  realUserId: string;
  /** Whether impersonation is currently active */
  isImpersonating: boolean;
  /** The impersonated user's name (if impersonating) */
  impersonatedUserName: string | null;
  /** Whether the real user is an admin */
  isAdmin: boolean;
}

/**
 * Get the admin preview state from cookies (server-side)
 */
export async function getAdminPreviewState(): Promise<AdminPreviewState> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ADMIN_PREVIEW_COOKIE)?.value;

  if (!cookieValue) {
    return DEFAULT_ADMIN_PREVIEW_STATE;
  }

  try {
    const decoded = decodeURIComponent(cookieValue);
    return JSON.parse(decoded) as AdminPreviewState;
  } catch {
    return DEFAULT_ADMIN_PREVIEW_STATE;
  }
}

/**
 * Check if a user is an admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return !!data?.user_id;
}

/**
 * Get the effective user for the current request.
 *
 * If the authenticated user is an admin with active impersonation,
 * returns the impersonated user's ID. Otherwise returns the real user's ID.
 *
 * @returns The effective user info, or null if not authenticated
 */
export async function getEffectiveUser(): Promise<EffectiveUser | null> {
  const supabase = await createSupabaseServer();

  // Get the real authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check if user is admin
  const isAdmin = await isUserAdmin(user.id);

  // If not admin, no impersonation possible
  if (!isAdmin) {
    return {
      id: user.id,
      realUserId: user.id,
      isImpersonating: false,
      impersonatedUserName: null,
      isAdmin: false,
    };
  }

  // Check for impersonation state
  const previewState = await getAdminPreviewState();

  // Only proceed if impersonation is active and has a user ID
  if (
    previewState.enabled &&
    previewState.mode === "impersonation" &&
    previewState.impersonatedUserId
  ) {
    // Verify the impersonated user exists
    const { data: impersonatedProfile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", previewState.impersonatedUserId)
      .maybeSingle();

    if (impersonatedProfile) {
      return {
        id: previewState.impersonatedUserId,
        realUserId: user.id,
        isImpersonating: true,
        impersonatedUserName:
          previewState.impersonatedUserName ||
          impersonatedProfile.full_name ||
          null,
        isAdmin: true,
      };
    }
  }

  // No active impersonation
  return {
    id: user.id,
    realUserId: user.id,
    isImpersonating: false,
    impersonatedUserName: null,
    isAdmin: true,
  };
}

/**
 * Get the effective user's profile
 *
 * Returns the profile of the impersonated user if active,
 * otherwise the real user's profile.
 */
export async function getEffectiveUserProfile() {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) {
    return { effectiveUser: null, profile: null };
  }

  const supabase = await createSupabaseServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", effectiveUser.id)
    .maybeSingle();

  return { effectiveUser, profile };
}
