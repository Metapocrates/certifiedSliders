# Certified Sliders — Current State ({{ date }})

- **Repository**: `main` @ `{{ commit_hash }}`
- **Maintainers**: Certified Sliders product team
- **Purpose**: Reference snapshot for engineering, design, and AI pair developers

---

## 0. Quick Summary
{{ high_level_summary }}

---

## 1. Tech Stack

- **Framework**: Next.js {{ next_version }}, React {{ react_version }}, TypeScript
- **UI**: Tailwind CSS, key components in `src/components`
- **State/Auth**: Supabase Auth (SSR helpers in `src/lib/supabase/compat.ts`)
- **Backend**: Supabase Postgres (migrations in `supabase/migrations`)
- **Server Utilities**: `createSupabaseAdmin`, server actions, OG routes
- **Design Tokens**: Tailwind config + gradients in components, reference Figma {{ figma_link_or_note }}

### 1.1 Dev Setup
```bash
git clone git@github.com:Metapocrates/certifiedSliders.git
cd certifiedsliders
cp .env.example .env.local
npm install
npm run dev

# database setup
supabase db push
```

### 1.2 Dependencies (key)
| Package | Version |
| --- | --- |
| next | {{ next_version }} |
| react / react-dom | {{ react_version }} |
| @supabase/supabase-js | {{ supabase_version }} |
| tailwindcss | {{ tailwind_version }} |
| typescript | {{ typescript_version }} |

---

## 2. Data Model & Schema Snapshot

### 2.1 Core Tables
- `profiles` — {{ profiles_note }}
- `results` — {{ results_note }}
- `external_identities` — {{ external_identities_note }}
- (add more as needed)

### 2.2 Relationships
- `results.profile_id → profiles.id`
- `external_identities.user_id → profiles.id`
- (extend as needed)

### 2.3 RLS Highlights
- Owner-only policies on `external_identities`
- Admin operations via service role

---

## 3. Feature Inventory

### 3.x Sections
- {{ feature_block_examples }}

Repeat for each category (Auth, Athlete-facing, Admin, Content, etc.)

---

## 4. API Endpoints

| Route | Method | Purpose | Auth |
| --- | --- | --- | --- |
| {{ route }} | {{ method }} | {{ purpose }} | {{ auth }} |

Add/remove rows as needed.

---

## 5. Recent Changes
- {{ change_log_entries }}

---

## 6. Workstream Status

### 6.1 In Progress
- {{ in_progress_items }}

### 6.2 Backlog / Roadmap
- {{ backlog_items }}

---

## 7. Automation / Integration Hooks
- {{ automations_note }}

---

## 8. Notes for Design & Branding
- {{ design_notes }}

---

## 9. Quick Links
- {{ quick_link_examples }}

---

_Update this template for each snapshot; replace placeholders with current data._
