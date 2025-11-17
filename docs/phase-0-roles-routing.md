# Phase 0 - Roles & Routing Implementation

**Status**: ✅ Complete
**Date**: 2025-11-16
**Branch**: main

---

## Overview

Phase 0 implements platform-wide role definitions and post-login routing rules for all user types (athlete, hs_coach, ncaa_coach, parent, admin).

---

## What Was Implemented

### 1. Database Schema ✅

**Existing Migrations Used:**
- [supabase/migrations/20251109000005_user_types.sql](../supabase/migrations/20251109000005_user_types.sql) - `profiles.user_type` column + `rpc_set_user_type()`
- [supabase/migrations/20251110181422_role_aware_routing.sql](../supabase/migrations/20251110181422_role_aware_routing.sql) - Routing fields, parent_links, hs_staff tables

**Schema Components:**
- `profiles.user_type` - Immutable role set at registration
- `profiles.role_preference` - Preferred role when user has multiple
- `profiles.default_home_route` - User's preferred landing page
- `profiles.onboarding_completed` - Tracks onboarding completion
- `parent_links` - Parent → athlete relationships
- `hs_staff` - High school coach records
- `program_memberships.verified_at` - NCAA coach verification

### 2. Role Helpers ✅

**File Created**: [src/lib/roles.ts](../src/lib/roles.ts)

**Functions:**
- `getUserRole(userId?)` - Get user's primary role and available roles
- `requireRole(allowedRoles, redirectTo?)` - Enforce role access (redirects if unauthorized)
- `hasRole(role)` - Check if user has specific role
- `isAdminUser()` - Check if user is admin
- `getDefaultRouteForRole(role)` - Get default dashboard for a role

**Role Detection Logic:**
1. Check `admins` table → admin role
2. Check `profiles.user_type` → primary role
3. Check `program_memberships` → ncaa_coach role
4. Check `hs_staff` → hs_coach role
5. Check `parent_links` (accepted) → parent role
6. Use `role_preference` to determine primary if multiple roles exist

### 3. Dashboard Routes ✅

**Files Created:**
- [src/app/dashboard/athlete/page.tsx](../src/app/dashboard/athlete/page.tsx) - Redirects to `/me`
- [src/app/dashboard/hs-coach/page.tsx](../src/app/dashboard/hs-coach/page.tsx) - HS coach portal
- [src/app/dashboard/ncaa-coach/page.tsx](../src/app/dashboard/ncaa-coach/page.tsx) - Redirects to `/coach/portal`
- [src/app/dashboard/parent/page.tsx](../src/app/dashboard/parent/page.tsx) - Parent dashboard
- [src/app/dashboard/admin/page.tsx](../src/app/dashboard/admin/page.tsx) - Redirects to `/admin`

**Access Control:**
- Each dashboard uses `requireRole()` to enforce access
- Unauthorized users redirected to their default dashboard
- Currently redirects to existing portals where applicable

### 4. Post-Login Routing ✅

**File Created**: [src/app/auth/post-login/route.ts](../src/app/auth/post-login/route.ts)

**Flow:**
1. User signs in at `/login`
2. Login page redirects to `/auth/post-login?next=...`
3. Post-login handler:
   - Checks if user is authenticated
   - Honors `?next` parameter if present
   - Falls back to `getUserRole()` to determine default dashboard
   - Redirects to appropriate dashboard

**Modified Files:**
- [src/app/login/page.tsx](../src/app/login/page.tsx) - Updated to use post-login handler
- [src/app/(public)/register/page.tsx](../src/app/(public)/register/page.tsx) - Updated to use role-based routing

### 5. Middleware Guard ✅

**File Modified**: [middleware.ts](../middleware.ts)

**Protection:**
- `/dashboard/*` - Requires authentication
- `/admin/*` - Requires authentication (role check in page)
- Unauthenticated users redirected to `/login?next=...`
- Role-specific access enforced at page level with `requireRole()`

---

## User Flows

### New User Registration

1. Navigate to `/register`
2. Select user type (athlete/hs_coach/ncaa_coach/parent)
3. Enter email/password or use Google OAuth
4. `rpc_set_user_type()` sets `profiles.user_type`
5. Redirect to role-based dashboard:
   - Athlete → `/dashboard/athlete` → `/me`
   - HS Coach → `/dashboard/hs-coach`
   - NCAA Coach → `/dashboard/ncaa-coach` → `/coach/portal`
   - Parent → `/dashboard/parent`

### Existing User Login

1. Navigate to `/login`
2. Enter credentials
3. Redirect to `/auth/post-login`
4. Post-login handler:
   - Calls `getUserRole()` to determine primary role
   - Redirects to `default_home_route` or role's default dashboard

### Multi-Role Users

Example: User is both an athlete and a parent

1. Login → redirected based on `role_preference` or primary role
2. Can manually navigate to different dashboards:
   - `/dashboard/athlete` for athlete features
   - `/dashboard/parent` for parent features
3. Each dashboard checks `availableRoles` and permits access if role exists

### Role Preference Management

Users with multiple roles can set their preference:

```typescript
await supabase.rpc("rpc_set_role_preference", {
  _role: "parent", // athlete | parent | hs_coach | ncaa_coach
});
```

---

## Role-to-Dashboard Mapping

| Role        | Default Dashboard      | Redirects To      | Features |
|-------------|------------------------|-------------------|----------|
| `athlete`   | `/dashboard/athlete`   | `/me`             | Profile, results, recruiting |
| `hs_coach`  | `/dashboard/hs-coach`  | (own page)        | Roster, submit results, analytics |
| `ncaa_coach`| `/dashboard/ncaa-coach`| `/coach/portal`   | Interested athletes, analytics |
| `parent`    | `/dashboard/parent`    | (own page)        | Linked athletes, college radar |
| `admin`     | `/dashboard/admin`     | `/admin`          | Full admin panel |

---

## RLS Policies

**Existing (from migrations):**
- `profiles` - Users can update their own routing fields
- `parent_links` - Parents see own links, athletes see links to them
- `hs_staff` - Staff see own record
- `program_memberships` - Coaches see own memberships

**No new RLS needed** - all policies already existed from prior migrations.

---

## API Functions

### RPC Functions (Existing)

**From `20251109000005_user_types.sql`:**
- `rpc_set_user_type(_user_type)` - Set user type once (immutable)

**From `20251110181422_role_aware_routing.sql`:**
- `rpc_set_default_home_route(_route)` - Set default landing page
- `rpc_set_role_preference(_role)` - Set preferred role
- `rpc_complete_onboarding()` - Mark onboarding complete

### Server Helpers (New)

**From `src/lib/roles.ts`:**
- `getUserRole(userId?)` - Determine user's roles
- `requireRole(role)` - Enforce role access
- `hasRole(role)` - Check role membership
- `isAdminUser()` - Check admin status

---

## Testing Checklist

### Registration Flow
- [ ] Athlete signup → lands on `/dashboard/athlete` → `/me`
- [ ] HS Coach signup → lands on `/dashboard/hs-coach`
- [ ] NCAA Coach signup → lands on `/dashboard/ncaa-coach` → `/coach/portal`
- [ ] Parent signup → lands on `/dashboard/parent`
- [ ] Google OAuth preserves user type selection

### Login Flow
- [ ] Athlete login → redirected to athlete dashboard
- [ ] NCAA coach login → redirected to coach portal
- [ ] Admin login → redirected to admin panel
- [ ] Multi-role user → redirected based on role_preference

### Dashboard Access
- [ ] Unauthenticated user → redirected to `/login?next=...`
- [ ] Athlete accessing `/dashboard/hs-coach` → redirected to own dashboard
- [ ] NCAA coach accessing `/dashboard/parent` → redirected to coach dashboard
- [ ] Admin can access all dashboards

### Multi-Role Users
- [ ] User with both athlete & parent roles can access both dashboards
- [ ] User with both athlete & ncaa_coach roles can access both
- [ ] Role preference determines default landing page

---

## Known Limitations

1. **Dashboard Placeholders**: Some dashboards are placeholders that redirect to existing pages
   - `Athlete` → redirects to `/me`
   - `NCAA Coach` → redirects to `/coach/portal`
   - `Admin` → redirects to `/admin`

2. **Role Detection Performance**: `getUserRole()` makes multiple DB queries
   - Consider caching in session/cookie for performance
   - Or create a materialized view of user roles

3. **No Role Switching UI**: Multi-role users must manually navigate to dashboards
   - Future: Add role switcher in navigation bar

4. **Onboarding Not Implemented**: `onboarding_completed` flag exists but no flow uses it yet
   - Future: Add role-specific onboarding screens

---

## Future Enhancements

### Phase 0.1: Role Switcher
- Add dropdown in header for multi-role users
- Shows available roles and allows quick switching
- Updates `role_preference` when user explicitly switches

### Phase 0.2: Onboarding Flows
- Athlete onboarding: Claim profile, add results
- HS Coach onboarding: Set school, invite athletes
- NCAA Coach onboarding: Select program (already exists)
- Parent onboarding: Link to athlete profiles

### Phase 0.3: Dashboard Unification
- Build real dashboards for athlete, admin roles
- Consolidate routing logic
- Add dashboard analytics/widgets

### Phase 0.4: Role Caching
- Cache role info in JWT/cookie to reduce DB queries
- Refresh on role changes
- Edge-compatible caching for middleware

---

## Migration Path for Existing Users

**Existing users already have:**
- `profiles.user_type` set (from registration or backfill)
- `program_memberships` for NCAA coaches
- `admins` for admin users

**No data migration needed** - existing users will:
1. Login → post-login handler calls `getUserRole()`
2. Auto-detected based on existing data
3. Redirected to appropriate dashboard

**For new features:**
- Users can optionally set `role_preference` via settings page
- Users can set custom `default_home_route` if desired

---

## Rollback Plan

If issues arise:

1. **Revert routing changes:**
   ```bash
   git revert <commit-hash>
   ```

2. **Update login to old behavior:**
   ```typescript
   // In login/page.tsx, change:
   router.replace("/auth/post-login");
   // Back to:
   router.replace("/me");
   ```

3. **Disable middleware:**
   ```typescript
   // In middleware.ts, change matcher to:
   export const config = { matcher: [] };
   ```

4. **No database changes needed** - all schema was from existing migrations

---

## Files Changed

**New Files:**
- `src/lib/roles.ts` (role helpers)
- `src/app/dashboard/athlete/page.tsx`
- `src/app/dashboard/hs-coach/page.tsx`
- `src/app/dashboard/ncaa-coach/page.tsx`
- `src/app/dashboard/parent/page.tsx`
- `src/app/dashboard/admin/page.tsx`
- `src/app/auth/post-login/route.ts`
- `docs/phase-0-roles-routing.md`

**Modified Files:**
- `middleware.ts` (added auth checks for /dashboard/*)
- `src/app/login/page.tsx` (use post-login handler)
- `src/app/(public)/register/page.tsx` (use role-based routing)

---

## Build Status

✅ **Build successful** - All TypeScript errors resolved, ready to deploy!

---

**Phase 0 Implementation Complete** ✅

Next steps: Test flows, then proceed to Phase 1 (Athlete Portal) or Phase H (Interest System) as needed.
