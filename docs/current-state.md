# Certified Sliders — Current State (Oct 27 2025)

- **Repository**: `main` @ `bff025457ff419c987126d0c0354683bbaa86956`
- **Maintainers**: Certified Sliders product team
- **Purpose**: Reference snapshot for engineering, design, and AI pair developers

---

## 0. Quick Summary
Certified Sliders is a Next.js 14 + Supabase platform for verified high-school track & field results. Athletes submit marks, admins review them, and the public can browse rankings, athlete profiles, and content. The next major ship is Athletic.net profile linking/verification.

---

## 1. Tech Stack

- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **UI**: Tailwind CSS + custom components (`src/components`), star-tier accents (`src/lib/star-theme.ts`)
- **State/Auth**: Supabase Auth (SSR helpers in `src/lib/supabase/compat.ts`)
- **Backend**: Supabase Postgres with migrations in `supabase/migrations`
- **Server Utilities**: Service-role admin client (`src/lib/supabase/admin.ts`), server actions, dynamic OG routes
- **Build/Deploy**: Vercel (Node 18/20), scripts in `package.json`
- **Design Tokens**: Tailwind config (`tailwind.config.cjs`) + gradient/accent utilities in component styles; reference Figma colors “Certified Sliders UI v2” (gold `#F5C518`, scarlet `#C8102E`)

### 1.1 Dev Setup
```bash
git clone git@github.com:Metapocrates/certifiedSliders.git
cd certifiedsliders
cp .env.example .env.local    # populate Supabase URL/keys
npm install
npm run dev

# database setup
supabase db push              # ensure migrations are applied
```

### 1.2 Dependencies (key)
| Package | Version |
| --- | --- |
| next | 14.2.5 |
| react / react-dom | 18.3.1 |
| @supabase/supabase-js | 2.56.0 |
| tailwindcss | 3.4.17 |
| typescript | 5.4.5 |

---

## 2. Data Model & Schema Snapshot

Migrations live in `supabase/migrations/`. Recent addition: `20251027143000_external_identities_verification.sql`.

### 2.1 Core Tables
- `profiles` — athlete/account metadata (name, school, star ratings, avatar)
- `results` — submitted performances with status + proof metadata
- `admins` — user IDs with admin rights
- `featured_profiles` — curated homepage picks
- `blog_posts` — editorial content (stories, announcements)
- `athlete_college_interests` — athlete-submitted interest programs
- `external_identities` — linked external accounts (now supports Athletic.net verification)

### 2.2 Relationships
- `results.profile_id → profiles.id`
- `featured_profiles.profile_id → profiles.id`
- `athlete_college_interests.athlete_id → profiles.id`
- `external_identities.user_id → profiles.id` (via auth user)
- `external_identities.provider/external_id` unique per provider across users

### 2.3 RLS Highlights
- Owner-only select/insert policies on `external_identities` (service role performs verification mutations)
- Admin flows use `createSupabaseAdmin()` with service-role key

---

## 3. Feature Inventory

### 3.1 Auth & Layout
- SSR session detection via `createSupabaseServer`
- Header nav (`src/components/SiteHeader`), theme-friendly hero/section styles
- Auth flows: `/login`, `/signin`, `/signout`; protected routes under `src/app/(protected)`

### 3.2 Athlete-Facing
- **Home (`/`)**: Hero with stats, accent badge, featured carousel, blog list, “What’s New” panel
- **Rankings (`/rankings`)**: Data table of verified results with star badge display
- **Athlete Profile (`/athletes/[username]`)**: Hero, verified marks grid, college interests, history link, owner-only share card panel
- **History (`/athletes/[username]/history`)**: Timeline of verified/pending marks
- **Shareable OG Image (`/athletes/[username]/opengraph-image`)**: Dynamic card built from query params

### 3.3 Submissions & Verification
- Athlete submission flow (`src/app/(protected)/submit-result`) with URL parsing & manual entry
- Admin review queue (`/admin/results`) with approve/reject server actions
- Star ratings admin UI (`/admin/ratings`) using `src/app/(protected)/admin/ratings/actions.ts`
- Audit logs and dashboards under `/admin`

### 3.4 Content & Featured
- Featured profiles carousel + grid (server components) with fallback logic
- Admin featured picker (`/admin/featured`)
- Blog posts listing & detail pages (`/blog`, `src/app/blog/[slug]`)

### 3.5 External Identity Verification (Backend Ready)
- Helpers in `src/lib/verification/athleticnet.ts`
- API routes:
  - `POST /api/verification/start`
  - `POST /api/verification/check`
  - `GET /api/verification/list`
  - `POST /api/verification/set-primary`
  - `POST /api/verification/remove`
- Supabase migration adds nonce/status/is_primary support on `external_identities`
- UI + ingest gating still outstanding (see Section 6)

### 3.6 Admin Utilities
- High school ingestion, autocomplete API (`/api/high-schools`)
- Admin overview page `/admin`
- Audit trail `/admin/audit`

---

## 4. API Endpoints (As of Oct 27 2025)

| Route | Method | Purpose | Auth |
| --- | --- | --- | --- |
| `/api/verification/start` | POST | Begin Athletic.net verification (nonce issue) | Yes |
| `/api/verification/check` | POST | Check nonce, mark verified | Yes |
| `/api/verification/list` | GET | List linked external identities | Yes |
| `/api/verification/set-primary` | POST | Mark verified link as primary | Yes |
| `/api/verification/remove` | POST | Remove linked identity | Yes |
| `/api/high-schools` | GET | High school autocomplete | No |
| `/api/admin/set-star` | POST | Admin star rating update | Admin |
| `/api/verification/*` | — | Additional routes under development, see Section 6 |

Server actions (non-REST) are embedded within protected routes (e.g., `src/app/(protected)/admin/results/actions.ts`).

---

## 5. Recent Changes (Oct 2025)

- Added gold/silver/bronze trims and “Certified” ribbons across featured cards
- Share panel now owner-only and generates dynamic OG card URL
- Rebuilt OG card route to rely on query params, added default export for App Router compatibility
- Expanded `external_identities` schema/migrations + verification API routes

---

## 6. Workstream Status

### 6.1 In Progress
- **Athletic.net Verification UI**: Settings panel for link/add/check/remove + public profile display of primary/secondary links
- **Ingest Gating**: Block auto-ingest until ≥1 verified Athletic.net identity exists

### 6.2 Backlog / Roadmap
- Admin-created profile shells (allow admins to pre-create athlete profiles for later claiming)
- Notifications & automation (email/SMS/webhooks) for verification status
- Media hub expansion (podcasts/video feeds)

---

## 7. Automation / Integration Hooks
- (Placeholder) – document cron jobs, onboarding scripts, or future ingestion pipelines here.

---

## 8. Notes for Design & Branding
- Star-tier accent colors and glow classes in `src/lib/star-theme.ts`
- Hero gradient/backdrop tokens inline in components (`bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#C8102E]`)
- Logo/favicons in `public/logo.svg`, `public/favicon*.png`
- For adjustments, reference Figma file “Certified Sliders UI v2” (not stored in repo)

---

## 9. Quick Links
- `src/app/page.tsx` — homepage hero & stats
- `src/app/(public)/athletes/[username]/page.tsx` — athlete profile
- `src/lib/verification/athleticnet.ts` — Athletic.net helpers
- `supabase/migrations/20251027143000_external_identities_verification.sql` — latest migration
- `docs/current-state-template.md` — reusable template for future snapshots

---

Maintained by the Certified Sliders engineering team. Update this doc after major releases or schema changes to keep GPT Desktop and collaborators in sync.
