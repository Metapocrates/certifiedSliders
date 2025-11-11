/**
 * Role Detection & Routing Utility
 *
 * Resolves the default home route for a user based on role priority:
 * Admin > NCAA Coach (verified) > HS Coach (verified) > Parent (accepted/pending) > Athlete > /welcome/choose-role
 */

import { createSupabaseServer } from '@/lib/supabase/compat';

export type UserRole = {
  role: 'admin' | 'ncaa_coach' | 'hs_coach' | 'parent' | 'athlete' | 'ambiguous';
  verified: boolean;
  defaultRoute: string;
};

/**
 * Resolve and persist the default route for a user
 * Priority: Admin > NCAA Coach > HS Coach > Parent > Athlete
 */
export async function resolveDefaultRouteForUser(userId: string): Promise<string> {
  const supabase = createSupabaseServer();

  // Check if route already set
  const { data: profile } = await supabase
    .from('profiles')
    .select('default_home_route, role_preference')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.default_home_route) {
    return profile.default_home_route;
  }

  // Detect role
  const detectedRole = await detectUserRole(userId);
  const route = detectedRole.defaultRoute;

  // Persist route
  await supabase
    .from('profiles')
    .update({
      default_home_route: route,
      onboarding_completed: detectedRole.role !== 'ambiguous'
    })
    .eq('id', userId);

  return route;
}

/**
 * Detect user role based on database relationships
 */
export async function detectUserRole(userId: string): Promise<UserRole> {
  const supabase = createSupabaseServer();

  // Check Admin
  const { data: adminRow } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (adminRow) {
    return {
      role: 'admin',
      verified: true,
      defaultRoute: '/admin'
    };
  }

  // Check NCAA Coach (verified)
  const { data: coachRow } = await supabase
    .from('program_memberships')
    .select('verified_at')
    .eq('user_id', userId)
    .not('verified_at', 'is', null)
    .maybeSingle();

  if (coachRow) {
    return {
      role: 'ncaa_coach',
      verified: true,
      defaultRoute: '/coach/portal'
    };
  }

  // Check HS Coach (verified)
  const { data: hsStaffRow } = await supabase
    .from('hs_staff')
    .select('verified_at')
    .eq('user_id', userId)
    .not('verified_at', 'is', null)
    .maybeSingle();

  if (hsStaffRow) {
    return {
      role: 'hs_coach',
      verified: true,
      defaultRoute: '/hs/portal'
    };
  }

  // Check Parent (accepted or pending)
  const { data: parentRow } = await supabase
    .from('parent_links')
    .select('status')
    .eq('parent_user_id', userId)
    .in('status', ['accepted', 'pending'])
    .maybeSingle();

  if (parentRow) {
    return {
      role: 'parent',
      verified: parentRow.status === 'accepted',
      defaultRoute: '/parent/dashboard'
    };
  }

  // Check Athlete (profiles.id = userId)
  const { data: athleteRow } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', userId)
    .eq('user_type', 'athlete')
    .maybeSingle();

  if (athleteRow) {
    return {
      role: 'athlete',
      verified: false, // Can add external_identities check later
      defaultRoute: '/me'
    };
  }

  // Ambiguous or no role
  return {
    role: 'ambiguous',
    verified: false,
    defaultRoute: '/welcome/choose-role'
  };
}

/**
 * Get all applicable roles for a user (for multi-role scenarios)
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const supabase = createSupabaseServer();
  const roles: UserRole[] = [];

  // Check all roles
  const [adminRow, coachRow, hsStaffRow, parentRow, athleteRow] = await Promise.all([
    supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('program_memberships').select('verified_at').eq('user_id', userId).not('verified_at', 'is', null).maybeSingle(),
    supabase.from('hs_staff').select('verified_at').eq('user_id', userId).not('verified_at', 'is', null).maybeSingle(),
    supabase.from('parent_links').select('status').eq('parent_user_id', userId).in('status', ['accepted', 'pending']).maybeSingle(),
    supabase.from('profiles').select('user_type').eq('id', userId).eq('user_type', 'athlete').maybeSingle()
  ]);

  if (adminRow.data) roles.push({ role: 'admin', verified: true, defaultRoute: '/admin' });
  if (coachRow.data) roles.push({ role: 'ncaa_coach', verified: true, defaultRoute: '/coach/portal' });
  if (hsStaffRow.data) roles.push({ role: 'hs_coach', verified: true, defaultRoute: '/hs/portal' });
  if (parentRow.data) roles.push({ role: 'parent', verified: parentRow.data.status === 'accepted', defaultRoute: '/parent/dashboard' });
  if (athleteRow.data) roles.push({ role: 'athlete', verified: false, defaultRoute: '/me' });

  return roles;
}

/**
 * Check if user has a specific role
 */
export async function hasRole(userId: string, role: UserRole['role']): Promise<boolean> {
  const supabase = createSupabaseServer();

  switch (role) {
    case 'admin':
      const { data: admin } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      return !!admin;

    case 'ncaa_coach':
      const { data: coach } = await supabase
        .from('program_memberships')
        .select('verified_at')
        .eq('user_id', userId)
        .not('verified_at', 'is', null)
        .maybeSingle();
      return !!coach;

    case 'hs_coach':
      const { data: hsStaff } = await supabase
        .from('hs_staff')
        .select('verified_at')
        .eq('user_id', userId)
        .not('verified_at', 'is', null)
        .maybeSingle();
      return !!hsStaff;

    case 'parent':
      const { data: parent } = await supabase
        .from('parent_links')
        .select('status')
        .eq('parent_user_id', userId)
        .in('status', ['accepted', 'pending'])
        .maybeSingle();
      return !!parent;

    case 'athlete':
      const { data: athlete } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .eq('user_type', 'athlete')
        .maybeSingle();
      return !!athlete;

    default:
      return false;
  }
}
