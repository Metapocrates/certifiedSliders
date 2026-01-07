# Admin Portal Switcher - Architecture Audit

## Existing Portal Architecture

### Route Structure

| Portal | Base Path | Layout File | Status |
|--------|-----------|-------------|--------|
| Athlete | `/me` | `(protected)/me/layout.tsx` | **Fully Built** |
| NCAA Coach | `/coach/portal` | `(protected)/coach/portal/layout.tsx` | **Beta** |
| HS Coach | `/hs/portal` | `(protected)/hs/portal/layout.tsx` | **Built** |
| Parent | `/parent` | `(protected)/parent/layout.tsx` | **Beta** |
| Admin | `/admin` | `(protected)/admin/layout.tsx` | **Fully Built** |

### Role Model

**Type Definition** (from `src/lib/roles.ts`):
```typescript
type UserRole = "athlete" | "hs_coach" | "ncaa_coach" | "parent" | "admin";
```

**Role Storage**:
| Role | Detection Table | Key Field |
|------|-----------------|-----------|
| admin | `admins` | `user_id` exists |
| ncaa_coach | `program_memberships` | `user_id` + `verified_at` |
| hs_coach | `hs_staff` | `user_id` + `verified_at` |
| parent | `parent_links` | `parent_user_id` + `status='accepted'` |
| athlete | `profiles` | `user_type='athlete'` (default) |

**User Profile Fields**:
- `profiles.user_type` - Primary user type
- `profiles.role_preference` - User's preferred role if multi-role
- `profiles.default_home_route` - Cached default portal route

### Authorization Layers

1. **Middleware** (`middleware.ts`): Protects `/dashboard`, `/admin`, `/coach`, `/parent`
2. **Layout Guards**: Each portal layout checks role access
3. **Page Guards**: Individual pages use `requireRole()`
4. **API Guards**: API routes check auth + role

### Existing Admin Infrastructure

- **Admin Panel**: `/admin` with 23+ pages
- **Admin Detection**: `admins` table lookup
- **Audit Logging**: `audit_log` table exists (used for some actions)

### Navigation/Layout Per Portal

| Portal | Visual Indicator | Nav Type |
|--------|-----------------|----------|
| Admin | Left sidebar (w-72) | 11 sections |
| NCAA Coach | Blue banner (#3B82F6) | Top nav |
| HS Coach | Standard layout | Top nav |
| Parent | Purple banner | Top nav |
| Athlete | Sidebar with profile | Left sidebar |

---

## Gaps to Fill

### 1. Portal Constants (Missing)
Need a single source of truth for portal definitions:
```typescript
const PORTALS: Record<PortalKey, PortalConfig>
```

### 2. Portal Context Provider (Missing)
No centralized context for:
- Active portal state
- Admin preview mode
- Impersonation state

### 3. Admin Preview Mode (Missing)
No infrastructure for:
- Portal override cookies
- Preview banners
- UI-level portal switching

### 4. Impersonation System (Missing)
No support for:
- Admin impersonation tokens
- Request-level user override
- Impersonation audit logging

### 5. Test Accounts (Partial)
- Test programs exist for NCAA coaches
- Need test accounts for all portal types

---

## Implementation Plan

### Phase 1: Constants & Types
- Create `src/lib/portals/constants.ts`
- Define PortalKey, PORTALS, PortalConfig

### Phase 2: Context Provider
- Create `src/contexts/PortalContext.tsx`
- Implement portal resolution logic
- Add cookie persistence for admin preview

### Phase 3: UI Components
- Portal badge component
- Admin preview banner
- Impersonation banner
- Admin testing page

### Phase 4: Backend
- Admin audit logging for portal actions
- Impersonation token system (optional)

### Phase 5: Integration
- Update layouts to use PortalContext
- Add signposting to all pages
- Test all portal switching flows
