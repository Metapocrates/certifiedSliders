# Coach Portal - Implementation Summary

**Last Updated:** 2025-11-09
**Status:** Phase 1 Complete ✅ | Phase 2 Complete ✅ | Phase 3 & 4 TODO

---

## Overview

The Coach Portal allows college track & field coaches to view and manage athletes who have expressed interest in their programs. Athletes can indicate interest in up to 10 programs, and coaches get a ranked view based on star ratings and verification status.

---

## ✅ What's Implemented (Phases 0-2)

### Database Schema

**New Tables Created:**
- ✅ `programs` - College track & field programs (NCAA D1/D2/D3, NAIA, NJCAA)
- ✅ `program_memberships` - Links coaches to programs they can access
- ✅ `program_domains` - Verified domains for email verification (e.g., stanford.edu)
- ✅ `coach_verification` - Verification scores and tiers for coaches
- ✅ `coach_domain_challenges` - DNS/HTTP domain ownership challenges
- ✅ `audit_log` - Tracks sensitive actions (exports, tier changes, etc.)

**Extended Tables:**
- ✅ `athlete_college_interests` - Added columns:
  - `program_id` (FK to programs)
  - `intent` (interested | commit | no_interest)
  - `share_contact`, `share_email`, `share_phone` (privacy gates)
  - `note` (athlete's note to coaches)

**RPC Functions:**
- ✅ `rpc_list_interested_athletes()` - Main query for portal list page
- ✅ `rpc_get_athlete_detail_for_coach()` - Athlete profile for coaches
- ✅ `rpc_get_athlete_results_for_coach()` - Top results for athlete
- ✅ `rpc_compute_coach_verification_score()` - Calculate verification score
- ✅ `rpc_update_coach_verification()` - Update verification record
- ✅ `rpc_get_coach_verification_status()` - Get current verification status

### Routes & Pages

**Public Routes:**
- ❌ `/coaches` - Landing/info page (MISSING - no dedicated coach marketing page)
- ✅ `/login` - Unified login for athletes and coaches

**Protected Routes (Coach):**
- ✅ `/coach/onboarding` - Program selection for new coaches
- ✅ `/coach/portal` - Main dashboard with athlete list
- ✅ `/coach/portal/athletes/[profileId]` - Athlete detail page
- ✅ `/coach/verify` - Verification flow page

**API Routes:**
- ✅ `/api/coach/join-program` - Join a program
- ✅ `/api/coach/export-csv` - Export athlete list to CSV
- ✅ `/api/coach/create-challenge` - Create DNS/HTTP verification challenge
- ✅ `/api/coach/check-challenge` - Check verification challenge status

### Features

**Portal List Page (`/coach/portal`):**
- ✅ Program switcher (dropdown for coaches with multiple programs)
- ✅ Search bar (athlete name)
- ✅ Filters: Class Year, Event, State, "Verified Only" toggle
- ✅ Table columns: Name, Profile ID, Class, State, School, Stars, Verified, Recent PB, Actions
- ✅ Server-side pagination (50 rows per page)
- ✅ CSV export (with tier gating)
- ✅ Verification status display (Tier 0/1/2 badges)

**Athlete Detail Page (`/coach/portal/athletes/[profileId]`):**
- ✅ Athlete header (name, pic, class year, school, state)
- ✅ Verification badge
- ✅ Star rating display (★★★★★)
- ✅ Bio section
- ✅ Academic info (GPA, test scores) - gated by share_contact
- ✅ Contact info (email, phone) - gated by share_email/share_phone
- ✅ Top results table (event, mark, meet, date, wind, timing, proof)
- ✅ Video clips section (if athlete has uploaded videos)
- ✅ Social media links
- ✅ "View Full Profile" button → public `/athletes/[profileId]`

**Verification System (Phase 2):**
- ✅ Tiered verification (0=Limited, 1=Verified, 2=Coordinator)
- ✅ Automatic scoring based on signals:
  - Email domain match (+30 points)
  - DNS TXT record proof (+40 points)
  - HTTP meta tag proof (+40 points)
  - Admin invitation (+70 points)
- ✅ Verification page with method options
- ✅ DNS/HTTP challenge creation and verification
- ✅ Auto-tier upgrade when verified
- ✅ Feature gating based on tier (Tier 0 can't export CSV)

**Security:**
- ✅ Row Level Security (RLS) on all tables
- ✅ Coaches only see athletes who expressed interest in their programs
- ✅ Athletes can only manage their own interests
- ✅ Athletes limited to 10 program interests
- ✅ Contact info gated by privacy settings
- ✅ Audit logging for sensitive actions (CSV exports)

**Components:**
- ✅ `CoachPortalTable` - Athlete list table
- ✅ `CoachPortalFilters` - Filter UI
- ✅ `ProgramSelector` - Program selection dropdown
- ✅ `VerificationStatus` - Current verification status display
- ✅ `VerificationMethods` - Verification flow UI

---

## 🚧 What's Left to Build (Phases 3-4)

### Phase 3: Monetization Hooks (Not Implemented)

**Missing Tables:**
- ❌ `program_entitlements` - Subscription tiers and limits
  ```sql
  CREATE TABLE program_entitlements (
    program_id uuid PRIMARY KEY,
    tier int DEFAULT 0,  -- 0=free, 1=premium, 2=enterprise
    features jsonb DEFAULT '{"csv_export_limit": 10, "analytics_enabled": false}',
    expires_at timestamptz,
    stripe_subscription_id text
  );
  ```

**Missing Features:**
- ❌ CSV export row limits (free: 10 rows, premium: unlimited)
- ❌ Stripe integration for subscriptions
- ❌ Feature flags per program
- ❌ Analytics dashboard (see below)

**Missing Views:**
- ❌ `mv_coach_analytics` - Materialized view for analytics:
  ```sql
  CREATE MATERIALIZED VIEW mv_coach_analytics AS
  SELECT
    program_id,
    class_year,
    COUNT(DISTINCT athlete_id) as interested_count,
    COUNT(DISTINCT CASE WHEN star_rating >= 4 THEN athlete_id END) as high_star_count,
    COUNT(DISTINCT CASE WHEN profile_verified THEN athlete_id END) as verified_count
  FROM athlete_college_interests
  JOIN profiles ON profiles.id = athlete_id
  WHERE intent IN ('interested', 'commit')
  GROUP BY program_id, class_year;
  ```

**Missing Routes:**
- ❌ `/coach/portal/analytics` - Analytics dashboard page
- ❌ `/api/coach/upgrade` - Subscription upgrade flow

### Phase 4: Partners Page (Not Implemented)

**Missing Tables:**
- ❌ `partners` - Brand partnerships and offers
  ```sql
  CREATE TABLE partners (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    logo_url text,
    offer_text text,
    offer_url text,
    category text CHECK (category IN ('brand','service','program','foundation')),
    is_active boolean DEFAULT true,
    priority int DEFAULT 0,
    starts_at timestamptz,
    ends_at timestamptz
  );
  ```

**Missing Routes:**
- ❌ `/partners` - Public partners page with offers
- ❌ `/admin/partners` - Admin page to manage partners

### Additional Missing Features

**Notifications:**
- ❌ Email notification when athlete expresses interest
- ❌ Edge function: `notify_interest_insert` triggered on new interest
- ❌ Opt-out preferences in `program_memberships` table
- ❌ SendGrid/Mailgun integration

**Rate Limiting:**
- ❌ CSV export rate limit (10 exports/hour per coach)
- ❌ API rate limiting for search queries

**Athlete-Facing Features:**
- ✅ Athletes can add college interests (implemented in `/me/share-with-coaches`)
- ❌ Athlete notification when coach views their profile
- ❌ "Coaches who viewed you" feature

**SEO & Public Pages:**
- ❌ `/coaches` - Public landing page explaining coach portal
- ❌ Coach portal in sitemap
- ❌ Coach testimonials section

---

## Architecture

### Data Flow

1. **Athlete expresses interest:**
   - Athlete navigates to `/me/share-with-coaches`
   - Selects up to 10 programs from dropdown
   - Sets privacy preferences (share_contact, share_email, share_phone)
   - Record created in `athlete_college_interests`

2. **Coach views interested athletes:**
   - Coach logs in at `/login`
   - If no program membership → redirect to `/coach/onboarding`
   - If has membership → `/coach/portal` shows list
   - Query: `rpc_list_interested_athletes()` with filters
   - Ranked by: star_rating DESC, profile_verified DESC, recent_pb_date DESC

3. **Coach views athlete detail:**
   - Click athlete row → `/coach/portal/athletes/[profileId]`
   - Verify access: check if athlete has interest in coach's program
   - Query: `rpc_get_athlete_detail_for_coach()` + `rpc_get_athlete_results_for_coach()`
   - Contact info shown only if `share_contact = true`

4. **Coach verification:**
   - Coach navigates to `/coach/verify`
   - Options: Email domain match, DNS proof, HTTP proof, Admin invitation
   - Creates challenge in `coach_domain_challenges`
   - System checks challenge → updates score in `coach_verification`
   - Tier upgrade if score >= 30 (Tier 1) or >= 70 (Tier 2)

### Verification Tiers

**Tier 0 - Limited Access (0-29 points):**
- Can view athlete list (but no contact info)
- Cannot export CSV
- Cannot see full athlete details
- Yellow warning banner prompts verification

**Tier 1 - Verified Coach (30-69 points):**
- Can view contact info (if athlete shared)
- Can export CSV (unlimited in current implementation)
- Can see full athlete details
- Blue "Verified Coach" badge

**Tier 2 - Coordinator (70+ points):**
- All Tier 1 features
- Can invite other coaches to program
- Priority support (planned)
- Purple "Coordinator" badge

### Verification Signals & Points

| Signal | Points | How to Achieve |
|--------|--------|----------------|
| Email domain match | +30 | Sign in with email ending in program domain (e.g., @stanford.edu) |
| DNS TXT record | +40 | Add `certified-sliders-verify=[nonce]` to DNS |
| HTTP meta tag | +40 | Add meta tag to program website |
| Admin invitation | +70 | Be invited by existing admin via `program_memberships.invited_by` |

### Privacy Controls

Athletes control what coaches see via these flags:
- `share_contact` - Master gate (must be true for any contact info)
- `share_email` - Show email address
- `share_phone` - Show phone number

Contact info hierarchy:
1. If `share_contact = false` → No contact info shown (even if email/phone flags are true)
2. If `share_contact = true` AND coach is Tier 1+ → Show info based on email/phone flags
3. If coach is Tier 0 → Never show contact info regardless of flags

---

## Database Relationships

```
programs (college programs)
  ├── program_memberships (coaches)
  │   └── auth.users (coach accounts)
  ├── program_domains (verified domains)
  ├── coach_domain_challenges (verification challenges)
  └── athlete_college_interests (athlete → program link)
      └── profiles (athletes)
          └── results (verified marks)

coach_verification (scoring)
  ├── user_id → auth.users
  └── program_id → programs
```

---

## Key Files

### Database
- `supabase/migrations/20251107000002_coach_portal_phase0.sql` - Phase 0 foundation
- `supabase/migrations/20251107000003_coach_portal_phase2_verification.sql` - Phase 2 verification
- `supabase/migrations/20251107000004_sync_programs_from_ncaa.sql` - NCAA programs sync
- `supabase/migrations/20241007233000_ncaa_track_programs.sql` - NCAA programs base

### Routes
- `src/app/(protected)/coach/onboarding/page.tsx` - Program selection
- `src/app/(protected)/coach/portal/page.tsx` - Main portal list
- `src/app/(protected)/coach/portal/athletes/[profileId]/page.tsx` - Athlete detail
- `src/app/(protected)/coach/verify/page.tsx` - Verification flow
- `src/app/(protected)/me/share-with-coaches/page.tsx` - Athlete interest management

### API Routes
- `src/app/api/coach/join-program/route.ts` - Join program
- `src/app/api/coach/export-csv/route.ts` - Export CSV
- `src/app/api/coach/create-challenge/route.ts` - Create verification challenge
- `src/app/api/coach/check-challenge/route.ts` - Check challenge status

### Components
- `src/components/coach/CoachPortalTable.tsx` - Athlete list table
- `src/components/coach/CoachPortalFilters.tsx` - Filter UI
- `src/components/coach/ProgramSelector.tsx` - Program dropdown
- `src/components/coach/VerificationStatus.tsx` - Verification badge/status
- `src/components/coach/VerificationMethods.tsx` - Verification flow UI

### Documentation
- `docs/coach-portal-spec-corrected.md` - Full spec (phases 0-4)
- `docs/ncaa-track-programs-playbook.md` - NCAA programs data

---

## Testing Checklist

### Phase 0-2 (Implemented)
- ✅ Coaches only see athletes who expressed interest in their programs
- ✅ Athletes can only manage their own interests
- ✅ Athletes limited to 10 program interests
- ✅ Contact info gated by `share_contact` flag
- ✅ Program A coach can't read Program B data
- ✅ CSV export works and logs to audit_log
- ✅ Verification scoring works correctly
- ✅ Tier 0 sees limited data (no contact, no CSV)
- ✅ Tier 1+ sees full data

### Phase 3-4 (Not Tested - Not Implemented)
- ❌ Free tier CSV capped at 10 rows
- ❌ Premium tier has unlimited CSV
- ❌ Analytics page shows counts (premium only)
- ❌ Partners page displays active offers

---

## Next Steps (Priority Order)

### High Priority (MVP Gaps)
1. ❌ Create `/coaches` landing page - coaches need to know this exists!
2. ❌ Implement email notifications on new interest
3. ❌ Add rate limiting to CSV export (10/hour)
4. ❌ Add CSV export row limit for free tier

### Medium Priority (Monetization)
5. ❌ Build `program_entitlements` table
6. ❌ Implement feature flags and tier limits
7. ❌ Create analytics materialized view
8. ❌ Build `/coach/portal/analytics` page
9. ❌ Add Stripe subscription integration

### Low Priority (Nice to Have)
10. ❌ Build partners table and `/partners` page
11. ❌ Add "Coaches who viewed you" for athletes
12. ❌ Add coach testimonials section
13. ❌ Optimize queries with additional indexes

---

## Known Issues

1. **No public coach landing page** - Coaches don't know about the portal unless they stumble upon it
2. **No notifications** - Coaches don't know when new athletes express interest
3. **No rate limiting** - Coaches could abuse CSV export
4. **No monetization** - Everything is free, no revenue model
5. **Verification page needs polish** - DNS/HTTP instructions could be clearer
6. **No SEO** - Coach portal not in sitemap, not indexed

---

## Quick Reference

### How coaches sign up:
1. Go to `/login` (same as athletes)
2. Sign up with email or Google
3. Automatically redirected to `/coach/onboarding`
4. Select their program
5. Join program (creates `program_memberships` record)
6. Redirected to `/coach/portal`

### How athletes express interest:
1. Navigate to `/me/share-with-coaches`
2. Click "Add Program"
3. Select program from dropdown (up to 10 total)
4. Set privacy preferences
5. Click "Save"
6. Record created in `athlete_college_interests`

### How verification works:
1. Coach logs in with email (e.g., coach@stanford.edu)
2. If email domain matches program domain → +30 points → Tier 1
3. Coach can add DNS/HTTP proof for +40 points
4. If invited by admin → +70 points → Tier 2
5. Tier determines features (contact info, CSV export, etc.)

---

**End of Summary**
