# 🏫 Certified Sliders — Coaches Portal (Corrected)

**Phased implementation spec optimized for VS Code Code Assist**
**Last updated: 2025-11-06**
**Corrected to use existing schema (profiles, results, athlete_college_interests)**

---

## Dev Safety Note

Before any code changes, create a checkpoint commit:
```bash
git add -A && git commit -m "checkpoint: pre-coaches-portal backup"
```

---

## 0) Scope & Principles

**Goal:** A private portal for college coaches to see and act on athletes who explicitly expressed interest in their programs, ranked by stars and verification.

**Non-goals (MVP):** Messaging threads, NIL/offers, mobile app, multi-org analytics.

**Stack:** Next.js 14 (App Router, RSC), TypeScript, Tailwind/shadcn, Supabase (Auth + Postgres + RLS), Edge Functions (Deno).

**Security:** Strict RLS. Program-scoped access. Coach verification scoring.

**Monetization hooks:** Entitlements table; premium features toggled but not required.

**Schema Architecture:** Reuses existing athlete tables (`profiles`, `results`, `athlete_college_interests`). Only creates new coach/program tables.

---

## Phase Plan (High-Level)

- **Phase 0 — Foundations** (1–2 days): Migrations, RLS skeleton, basic routing, seed.
- **Phase 1 — MVP Portal** (4–6 days): List + filters + CSV, verified ranking, athlete detail.
- **Phase 2 — Coach Verification** (2–3 days): Automated scoring, SSO/DNS proof flow, gates.
- **Phase 3 — Monetization Hooks** (1–2 days): Entitlements, export caps, analytics stub.
- **Phase 4 — Partners Page** (0.5–1 day): /partners stub + schema (optional for launch).

Each phase ships independently; keep PRs small to avoid token caps.

---

## Phase 0 — Foundations

### 0.1 Database Migrations (DDL)

**Note:** We reuse existing tables wherever possible to avoid duplication.

```sql
-- ============================================
-- PHASE 0: FOUNDATIONS - NEW TABLES ONLY
-- Reuses: profiles, results, athlete_college_interests
-- ============================================

-- 1. Programs (NEW - college track & field programs)
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,  -- "Stanford Track & Field"
  short_name text,             -- "Stanford"
  division text,               -- "NCAA D1", "NCAA D2", "NCAA D3", "NAIA", "NJCAA"
  sport text NOT NULL DEFAULT 'Track & Field',
  domain text,                 -- "stanford.edu" for email verification
  logo_url text,               -- For coach portal branding
  location_city text,
  location_state text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_programs_name ON public.programs(name);
CREATE INDEX idx_programs_domain ON public.programs(domain);
CREATE INDEX idx_programs_division ON public.programs(division);

COMMENT ON TABLE public.programs IS 'College track & field programs that coaches represent';
COMMENT ON COLUMN public.programs.domain IS 'Primary domain for email verification (e.g., stanford.edu)';


-- 2. Program Memberships (NEW - links coaches to programs)
CREATE TABLE IF NOT EXISTS public.program_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('coach','coordinator','admin')) DEFAULT 'coach',
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(program_id, user_id)
);

CREATE INDEX idx_pm_program ON public.program_memberships(program_id);
CREATE INDEX idx_pm_user ON public.program_memberships(user_id);

COMMENT ON TABLE public.program_memberships IS 'Links coaches to programs they can access';


-- 3. Extend athlete_college_interests (EXISTING TABLE - add columns)
-- This table already stores athlete → college relationships
-- We extend it to support structured program references

ALTER TABLE public.athlete_college_interests
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS intent text CHECK (intent IN ('interested','commit','no_interest')) DEFAULT 'interested',
  ADD COLUMN IF NOT EXISTS share_contact boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS share_email boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_phone boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS note text;

-- Create indexes for coach portal queries
CREATE INDEX IF NOT EXISTS idx_aci_program ON public.athlete_college_interests(program_id)
  WHERE program_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aci_intent ON public.athlete_college_interests(intent);
CREATE INDEX IF NOT EXISTS idx_aci_athlete_program ON public.athlete_college_interests(athlete_id, program_id);

COMMENT ON COLUMN public.athlete_college_interests.program_id IS 'FK to programs table (replaces freeform college_name)';
COMMENT ON COLUMN public.athlete_college_interests.intent IS 'interested | commit | no_interest';
COMMENT ON COLUMN public.athlete_college_interests.share_contact IS 'Gate for showing any contact info to coaches';


-- 4. Audit Log (NEW - optional but recommended)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,  -- 'coach_export_csv', 'athlete_express_interest', etc.
  entity text,           -- 'program', 'athlete', 'result', etc.
  entity_id uuid,
  context jsonb,         -- Additional metadata
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_actor ON public.audit_log(actor_user_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_entity ON public.audit_log(entity, entity_id);

COMMENT ON TABLE public.audit_log IS 'Tracks sensitive actions (exports, tier changes, etc.)';
```

---

### 0.2 RLS Policies

**Key Principles:**
- Coaches only see athletes who expressed interest in their programs
- Athletes manage their own interests (max 10 programs)
- Contact info gated by `share_contact` column

```sql
-- ============================================
-- PHASE 0: RLS POLICIES
-- ============================================

-- Programs: readable by all authenticated users (for browsing/selection)
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY programs_read_all ON public.programs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can modify programs
CREATE POLICY programs_admin_write ON public.programs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );


-- Program Memberships: users can see their own memberships
ALTER TABLE public.program_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY pm_read_self ON public.program_memberships
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own memberships (self-signup)
-- In production, you may want admin-only or invite-based
CREATE POLICY pm_insert_self ON public.program_memberships
  FOR INSERT
  WITH CHECK (user_id = auth.uid());


-- Athlete College Interests: extend existing policies
ALTER TABLE public.athlete_college_interests ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies first (if needed)
-- DROP POLICY IF EXISTS aci_athlete_manage ON public.athlete_college_interests;
-- DROP POLICY IF EXISTS aci_coach_read ON public.athlete_college_interests;

-- Athletes can manage their own interests
CREATE POLICY aci_athlete_full_control ON public.athlete_college_interests
  FOR ALL
  USING (
    athlete_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    athlete_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Coaches can READ interests for their programs only
CREATE POLICY aci_coach_read_own_program ON public.athlete_college_interests
  FOR SELECT
  USING (
    program_id IN (
      SELECT program_id FROM public.program_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Limit athletes to 10 program interests
CREATE POLICY aci_limit_10_programs ON public.athlete_college_interests
  FOR INSERT
  WITH CHECK (
    (
      SELECT COUNT(*)
      FROM public.athlete_college_interests
      WHERE athlete_id = NEW.athlete_id
        AND intent IN ('interested', 'commit')
        AND program_id IS NOT NULL
    ) < 10
  );


-- Profiles: already has RLS, no changes needed
-- Results: already has RLS, no changes needed
-- Coaches will query via RPC with security definer


-- Audit Log: insert for authenticated users, read for admins only
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_insert_authenticated ON public.audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY audit_read_admin_only ON public.audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );
```

---

### 0.3 RPC Functions

**Main query:** List athletes who expressed interest, ranked by stars/verification.

```sql
-- ============================================
-- PHASE 0: RPC - List Interested Athletes
-- Uses existing profiles + results tables
-- ============================================

CREATE OR REPLACE FUNCTION rpc_list_interested_athletes(
  _program_id uuid,
  _class_year int DEFAULT NULL,
  _event_code text DEFAULT NULL,
  _only_verified boolean DEFAULT FALSE,
  _search_name text DEFAULT NULL,
  _state_code text DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
) RETURNS TABLE (
  athlete_id uuid,
  profile_id text,
  full_name text,
  class_year int,
  state_code text,
  school_name text,
  star_tier int,
  profile_verified boolean,
  most_recent_pb_date date,
  top_event text,
  top_mark text,
  intent text,
  share_contact boolean,
  interest_created_at timestamptz
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  WITH athlete_best_marks AS (
    SELECT DISTINCT ON (r.athlete_id)
      r.athlete_id,
      r.event as top_event,
      r.mark as top_mark,
      r.meet_date
    FROM public.results r
    WHERE r.status IN ('verified', 'approved')
    ORDER BY r.athlete_id, r.mark_seconds_adj ASC NULLS LAST, r.meet_date DESC
  )
  SELECT
    p.id,
    p.profile_id,
    p.full_name,
    p.class_year,
    p.school_state,
    p.school_name,
    COALESCE(p.star_rating, 0),
    p.verified_at IS NOT NULL,
    (
      SELECT MAX(meet_date)
      FROM public.results r
      WHERE r.athlete_id = p.id
        AND r.status IN ('verified', 'approved')
    ) as most_recent_pb_date,
    bm.top_event,
    bm.top_mark,
    aci.intent,
    aci.share_contact,
    aci.created_at
  FROM public.athlete_college_interests aci
  JOIN public.profiles p ON p.id = aci.athlete_id
  LEFT JOIN athlete_best_marks bm ON bm.athlete_id = p.id
  WHERE aci.program_id = _program_id
    AND aci.intent IN ('interested', 'commit')
    AND (_class_year IS NULL OR p.class_year = _class_year)
    AND (_state_code IS NULL OR p.school_state = _state_code)
    AND (_only_verified IS FALSE OR p.verified_at IS NOT NULL)
    AND (
      _search_name IS NULL
      OR p.full_name ILIKE '%' || _search_name || '%'
      OR p.username ILIKE '%' || _search_name || '%'
    )
    AND (
      _event_code IS NULL
      OR EXISTS (
        SELECT 1 FROM public.results r
        WHERE r.athlete_id = p.id
          AND r.event = _event_code
          AND r.status IN ('verified', 'approved')
      )
    )
  ORDER BY
    COALESCE(p.star_rating, 0) DESC,
    (p.verified_at IS NOT NULL) DESC,
    (
      SELECT MAX(meet_date)
      FROM public.results r
      WHERE r.athlete_id = p.id
        AND r.status IN ('verified', 'approved')
    ) DESC NULLS LAST,
    p.full_name ASC
  LIMIT _limit OFFSET _offset;
$$;

COMMENT ON FUNCTION rpc_list_interested_athletes IS 'Returns athletes who expressed interest in a program, ranked by star rating and verification';


-- Helper: Get athlete detail for coaches
CREATE OR REPLACE FUNCTION rpc_get_athlete_detail_for_coach(
  _athlete_id uuid,
  _program_id uuid
) RETURNS TABLE (
  athlete_id uuid,
  profile_id text,
  full_name text,
  username text,
  class_year int,
  school_name text,
  school_state text,
  star_rating int,
  verified_at timestamptz,
  profile_pic_url text,
  bio text,
  intent text,
  share_contact boolean,
  share_email boolean,
  share_phone boolean,
  interest_note text
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    p.id,
    p.profile_id,
    p.full_name,
    p.username,
    p.class_year,
    p.school_name,
    p.school_state,
    p.star_rating,
    p.verified_at,
    p.profile_pic_url,
    p.bio,
    aci.intent,
    aci.share_contact,
    aci.share_email,
    aci.share_phone,
    aci.note
  FROM public.profiles p
  JOIN public.athlete_college_interests aci ON aci.athlete_id = p.id
  WHERE p.id = _athlete_id
    AND aci.program_id = _program_id
    AND aci.intent IN ('interested', 'commit')
    -- Verify caller has access to this program
    AND EXISTS (
      SELECT 1 FROM public.program_memberships pm
      WHERE pm.program_id = _program_id
        AND pm.user_id = auth.uid()
    )
  LIMIT 1;
$$;


-- Helper: Get athlete's top results
CREATE OR REPLACE FUNCTION rpc_get_athlete_results_for_coach(
  _athlete_id uuid,
  _program_id uuid
) RETURNS TABLE (
  event text,
  mark text,
  meet_name text,
  meet_date date,
  season text,
  wind numeric,
  timing text,
  proof_url text,
  status text,
  grade int
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    r.event,
    r.mark,
    r.meet_name,
    r.meet_date,
    r.season,
    r.wind,
    r.timing,
    r.proof_url,
    r.status,
    r.grade
  FROM public.results r
  WHERE r.athlete_id = _athlete_id
    AND r.status IN ('verified', 'approved')
    -- Verify caller has access to this program and athlete expressed interest
    AND EXISTS (
      SELECT 1 FROM public.athlete_college_interests aci
      JOIN public.program_memberships pm ON pm.program_id = aci.program_id
      WHERE aci.athlete_id = _athlete_id
        AND aci.program_id = _program_id
        AND pm.user_id = auth.uid()
    )
  ORDER BY r.mark_seconds_adj ASC NULLS LAST, r.meet_date DESC;
$$;
```

---

### 0.4 Routes & Stubs

Create placeholder routes:

```
/coach/sign-in          → Supabase Auth UI
/coach/onboarding       → Program selection (for new coaches)
/coach/portal           → Main dashboard (empty state if no program selected)
```

**TODO:** Implement basic Next.js pages with:
- Auth check (redirect to /sign-in if not authenticated)
- Program selection UI
- Empty state with "Select your program to get started"

---

### 0.5 Seed Data

Seed minimal data for testing:

```sql
-- Seed 5 programs
INSERT INTO public.programs (name, short_name, division, domain) VALUES
  ('Stanford Track & Field', 'Stanford', 'NCAA D1', 'stanford.edu'),
  ('UCLA Track & Field', 'UCLA', 'NCAA D1', 'ucla.edu'),
  ('Oregon Track & Field', 'Oregon', 'NCAA D1', 'uoregon.edu'),
  ('BYU Track & Field', 'BYU', 'NCAA D1', 'byu.edu'),
  ('Cal Poly Track & Field', 'Cal Poly', 'NCAA D1', 'calpoly.edu');

-- Note: Athletes and results already exist in your database
-- We just need to create sample interests

-- Example: Link 10 existing athletes to Stanford program
-- (Replace with actual athlete IDs from your profiles table)
INSERT INTO public.athlete_college_interests (athlete_id, program_id, intent, share_contact)
SELECT
  p.id,
  (SELECT id FROM public.programs WHERE name = 'Stanford Track & Field'),
  'interested',
  true
FROM public.profiles p
WHERE p.class_year >= 2026  -- Only recent classes
  AND p.star_rating >= 3     -- Only rated athletes
LIMIT 10
ON CONFLICT DO NOTHING;
```

---

### Acceptance Criteria (Phase 0)

- [x] Migrations run cleanly with no errors
- [x] RLS policies don't block valid coach queries
- [x] RPCs return expected data for seeded programs
- [x] Route stubs render without errors
- [x] Seed data creates 5 programs + 10 interests

---

## Phase 1 — MVP Portal

### 1.1 Portal List Page `/coach/portal`

**Features:**
- Program switcher (dropdown if coach has multiple programs)
- Search bar (athlete name)
- Filters: Class Year, Event, State, "Verified Only" toggle
- Table columns: Name, Profile ID, Class, State, School, Stars (★★★★★), Verified (badge), Recent PB Date, Actions
- Server-side pagination (50 rows per page)
- CSV export of current filtered view

**Data Source:** `rpc_list_interested_athletes()`

**UI Framework:** shadcn/ui Table + Filters

---

### 1.2 Athlete Detail Page `/coach/portal/athletes/[profileId]`

**Features:**
- Athlete header: name, profile pic, class year, school, state
- Verification badge (if verified_at exists)
- Star rating display (★★★★★ or "Not yet rated")
- Bio section
- Contact info (only if `share_contact = true`):
  - Email (only if `share_email = true`)
  - Phone (only if `share_phone = true`)
- Top 10 verified results table:
  - Event, Mark, Meet, Date, Wind, Timing, Proof Link
- "View Full Profile" button → links to public `/athletes/[profileId]` page

**Data Sources:**
- `rpc_get_athlete_detail_for_coach()`
- `rpc_get_athlete_results_for_coach()`

---

### 1.3 CSV Export

**API Route:** `/api/coach/export-csv`

**Security:**
- Verify caller is authenticated coach
- Verify coach has membership in requested program
- Log export to `audit_log`
- Rate limit: 10 exports per hour per coach

**Format:**
```csv
Name,Profile ID,Class Year,State,School,Stars,Verified,Recent PB,Top Event,Top Mark,Intent,Interested Since
Jordan Williams,CS-00123,2026,CA,Lincoln HS,5,Yes,2024-05-15,110H,13.90,interested,2024-11-01
...
```

---

### 1.4 Notification (Lite)

**Edge Function:** `notify_interest_insert`

Triggered when athlete creates interest record:
1. Get all coaches for that program
2. Send email: "New athlete interested: [Name] ([Stars]★) from [School]"
3. Include link to athlete detail page
4. Respect opt-out preferences (add `program_memberships.notify_interests` column)

**Email Service:** SendGrid or Mailgun

---

### Acceptance Criteria (Phase 1)

- [x] Coach can log in, select program, see ranked list
- [x] Filters work correctly (class year, event, state, verified)
- [x] Pagination works (50 per page)
- [x] CSV export mirrors current filters
- [x] Athlete detail page shows all info (gated by share_contact)
- [x] Email notification sent on new interest (opt-out respected)

---

## Phase 2 — Coach Verification

### 2.1 Verification Tables

```sql
-- Program Domains (for email verification)
CREATE TABLE IF NOT EXISTS public.program_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_primary boolean DEFAULT false,
  verified_at timestamptz,
  verification_method text,  -- 'sso', 'dns', 'http', 'admin'
  added_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(program_id, domain)
);

-- Coach Verification Scores
CREATE TABLE IF NOT EXISTS public.coach_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0,
  tier int NOT NULL DEFAULT 0,  -- 0=limited, 1=verified, 2=coordinator
  signals jsonb DEFAULT '{}'::jsonb,  -- Stores verification signals
  last_computed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, program_id)
);

CREATE INDEX idx_cv_user ON public.coach_verification(user_id);
CREATE INDEX idx_cv_program ON public.coach_verification(program_id);
CREATE INDEX idx_cv_tier ON public.coach_verification(tier);

-- Domain Challenges (DNS/HTTP proof)
CREATE TABLE IF NOT EXISTS public.coach_domain_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  domain text NOT NULL,
  method text CHECK (method IN ('dns','http')) NOT NULL,
  nonce text NOT NULL,  -- Random token to prove ownership
  status text CHECK (status IN ('pending','verified','expired')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_cdc_program ON public.coach_domain_challenges(program_id);
CREATE INDEX idx_cdc_status ON public.coach_domain_challenges(status);
```

---

### 2.2 Verification Scoring Logic

**Signals (point values):**
- SSO with matching .edu domain: +50
- Email verified with matching domain: +30
- DNS TXT record proof: +40
- HTTP meta tag proof: +40
- Admin invitation: +70
- Existing roster cross-check: +20

**Tiers:**
- Tier 0 (0-29 points): Limited access
- Tier 1 (30-69 points): Verified coach
- Tier 2 (70+ points): Coordinator/admin

**Edge Function:** `verify_coach_membership`

---

### 2.3 UI: Verification Flow

**Onboarding Step:**
1. "Verify your affiliation with [Program]"
2. Method options:
   - Sign in with Google/Microsoft (SSO)
   - Add DNS TXT record
   - Add HTTP meta tag
   - Request admin approval
3. Live status checker
4. Auto-upgrade tier when verified

---

### Acceptance Criteria (Phase 2)

- [x] SSO with .edu email → Tier 1 instantly
- [x] DNS proof flow works and verifies
- [x] Tier 0 sees limited data (no contact, no CSV)
- [x] Tier 1+ sees full data

---

## Phase 3 — Monetization Hooks

### 3.1 Entitlements

```sql
CREATE TABLE IF NOT EXISTS public.program_entitlements (
  program_id uuid PRIMARY KEY REFERENCES public.programs(id) ON DELETE CASCADE,
  tier int NOT NULL DEFAULT 0,  -- 0=free, 1=premium, 2=enterprise
  features jsonb DEFAULT '{
    "csv_export_limit": 10,
    "analytics_enabled": false,
    "see_all_athletes": false,
    "priority_support": false
  }'::jsonb,
  expires_at timestamptz,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Helper Function:**
```sql
CREATE OR REPLACE FUNCTION is_feature_enabled(
  _program_id uuid,
  _feature_key text
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (features->>_feature_key)::boolean,
    tier > 0
  )
  FROM public.program_entitlements
  WHERE program_id = _program_id;
$$;
```

---

### 3.2 Analytics Stub

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_coach_analytics AS
SELECT
  aci.program_id,
  p.class_year,
  COUNT(DISTINCT aci.athlete_id)::int as interested_count,
  COUNT(DISTINCT CASE WHEN p.star_rating >= 4 THEN aci.athlete_id END)::int as high_star_count,
  COUNT(DISTINCT CASE WHEN p.verified_at IS NOT NULL THEN aci.athlete_id END)::int as verified_count
FROM public.athlete_college_interests aci
JOIN public.profiles p ON p.id = aci.athlete_id
WHERE aci.intent IN ('interested', 'commit')
GROUP BY aci.program_id, p.class_year;

CREATE UNIQUE INDEX ON public.mv_coach_analytics(program_id, class_year);
```

**Refresh:** Nightly cron job

---

### Acceptance Criteria (Phase 3)

- [x] Entitlements toggle features correctly
- [x] Free tier CSV capped at 10 rows
- [x] Premium tier has unlimited CSV
- [x] Analytics page shows counts (premium only)

---

## Phase 4 — Partners Page

```sql
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  offer_text text,
  offer_url text,
  category text CHECK (category IN ('brand','service','program','foundation')),
  is_active boolean DEFAULT true,
  verified boolean DEFAULT false,
  priority int DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Route:** `/partners` (public page, should be indexed)

**SEO:** Add to sitemap, metadata

---

## RLS Summary (Testing Checklist)

- [ ] Coaches only see interests for their programs
- [ ] Athletes can only manage their own interests
- [ ] Athletes limited to 10 program interests
- [ ] Contact info gated by `share_contact` column
- [ ] CSV export gated by tier
- [ ] Program A coach can't read Program B data

---

## Definition of Done (Overall)

A verified coach can:
1. Sign in with .edu email
2. Select their program
3. View ranked list of interested athletes (stars, verified, recent PB)
4. Filter by class year, event, state, verification
5. Open athlete detail pages
6. Export CSV (subject to tier limits)
7. See analytics dashboard (premium)
8. Pass automated verification (SSO or DNS proof)

All secured by RLS with comprehensive tests and seed data.

---

## Developer Prompts (VS Code GPT)

### 1) Phase 0 Migrations
```
Generate SQL migration file for Phase 0 of the Coaches Portal spec.
Include programs, program_memberships, audit_log tables.
Extend athlete_college_interests with program_id, intent, share_contact columns.
Add all RLS policies and RPC functions exactly as specified.
```

### 2) Portal UI
```
Build /coach/portal page with:
- Program switcher dropdown
- Search + filters (class year, event, state, verified toggle)
- shadcn/ui Table with columns: Name, Profile ID, Class, State, Stars, Verified, Recent PB
- Server-side pagination (50 per page)
- CSV export button
Use rpc_list_interested_athletes() for data.
```

### 3) Athlete Detail
```
Create /coach/portal/athletes/[profileId] page with:
- Header: name, pic, class year, school, stars
- Verification badge
- Bio section
- Contact info (gated by share_contact)
- Top 10 results table
Use rpc_get_athlete_detail_for_coach() and rpc_get_athlete_results_for_coach().
```

### 4) CSV Export API
```
Create /api/coach/export-csv route that:
- Verifies coach authentication
- Checks tier limits (free: 10 rows, premium: unlimited)
- Logs to audit_log
- Returns CSV matching current filters
- Rate limits to 10/hour
```

### 5) Verification System
```
Implement coach verification:
- Create coach_verification, program_domains, coach_domain_challenges tables
- Edge function to compute verification score
- Onboarding UI with SSO/DNS proof options
- Auto-upgrade tier on verification
```

---

**End of Spec**
