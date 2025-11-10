# Staging & Development Environment Setup

> Safe **staging** environment and **local dev** workflow without touching production.

## Overview

This guide sets up three environments:
- **Production** (`https://certifiedsliders.com`) - Live site with real user data
- **Staging** (Vercel Preview) - Testing environment for PRs
- **Local** (`http://localhost:3000`) - Development environment

---

## 1. Create Supabase Staging Project

### Step 1.1: Create the Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name: `certifiedsliders-staging`
4. Choose same region as production (for consistency)
5. Generate a strong database password and save it securely
6. Wait for project to provision

### Step 1.2: Note Your Staging Credentials

Once created, go to **Project Settings** > **API**:

```
Project URL: https://<STAGING_REF>.supabase.co
anon/public key: eyJh... (copy this)
service_role key: eyJh... (copy this - keep secure!)
```

Go to **Project Settings** > **Database**:

```
Connection string (URI): postgresql://postgres:<password>@db.<STAGING_REF>.supabase.co:5432/postgres
```

### Step 1.3: Apply Schema Migrations

Push your existing migrations to the staging database:

```bash
# Checkpoint before any database changes
git add -A && git commit -m "checkpoint: before staging setup"

# Push migrations to staging
supabase db push --project-ref <STAGING_REF>
```

Verify migrations applied:

```bash
# Check what tables exist
supabase db remote --project-ref <STAGING_REF>

# Or via psql
psql "postgresql://postgres:<password>@db.<STAGING_REF>.supabase.co:5432/postgres" -c "\dt"
```

### Step 1.4: Optional - Seed Sample Data

If you want sample data in staging:

```bash
# Option A: Copy schema only (no prod data)
pg_dump "$PROD_DATABASE_URL" --schema-only > /tmp/schema.sql
psql "postgresql://postgres:<password>@db.<STAGING_REF>.supabase.co:5432/postgres" -f /tmp/schema.sql

# Option B: Create a seed script (recommended)
node scripts/seed-staging.mjs
```

---

## 2. Configure Vercel Environment Variables

### Step 2.1: Production Scope (unchanged)

Your existing production environment variables stay the same in **Production** scope:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://<PROD_REF>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (prod anon key)
- `SUPABASE_SERVICE_ROLE_KEY` = (prod service role key)
- `NEXT_PUBLIC_SITE_URL` = `https://certifiedsliders.com`
- `NEXT_PUBLIC_SUPABASE_SITE_URL` = `https://certifiedsliders.com`
- `NEXT_PUBLIC_APP_URL` = `https://certifiedsliders.com`
- `CLAIM_TOKEN_SECRET` = (prod secret)
- `CLOUDFLARE_ACCOUNT_ID` = (prod cloudflare)
- `CLOUDFLARE_API_TOKEN` = (prod cloudflare)
- `DATABASE_URL` = (prod database URL)

### Step 2.2: Preview Scope (new - for PRs and staging)

Add these environment variables to **Preview** scope:

```bash
# Supabase - Staging
NEXT_PUBLIC_SUPABASE_URL=https://<STAGING_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>

# Site URLs - will be overridden by Vercel with actual preview URL
NEXT_PUBLIC_SITE_URL=https://<your-project>.vercel.app
NEXT_PUBLIC_SUPABASE_SITE_URL=https://<your-project>.vercel.app
NEXT_PUBLIC_APP_URL=https://<your-project>.vercel.app

# Generate a NEW claim token secret for staging
CLAIM_TOKEN_SECRET=<new-random-secret-for-staging>

# Cloudflare (can use same as prod or separate staging account)
CLOUDFLARE_ACCOUNT_ID=<same-as-prod-or-staging>
CLOUDFLARE_API_TOKEN=<same-as-prod-or-staging>

# Database URL (staging)
DATABASE_URL=postgresql://postgres:<password>@db.<STAGING_REF>.supabase.co:5432/postgres
```

To generate a new `CLAIM_TOKEN_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### Step 2.3: Development Scope

Leave **Development** scope empty. Local development uses `.env.local`.

---

## 3. Local Development Setup

You have two options for local development:

### Option A: Local → Staging Supabase (Recommended for Quick Start)

Copy `.env.staging.example` to `.env.local`:

```bash
cp .env.staging.example .env.local
```

Edit `.env.local` with your staging credentials:

```bash
# Supabase - Staging Project
NEXT_PUBLIC_SUPABASE_URL=https://<STAGING_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>

# Site URLs - Local
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database URL
DATABASE_URL=postgresql://postgres:<password>@db.<STAGING_REF>.supabase.co:5432/postgres

# Claim Token Secret (local)
CLAIM_TOKEN_SECRET=<generate-new-random-for-local>

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
CLOUDFLARE_API_TOKEN=<your-api-token>
```

### Option B: Fully Local Supabase (Isolated, requires Docker)

For complete isolation, run Supabase locally:

```bash
# Initialize Supabase (if not already done)
supabase init

# Start local Supabase stack (requires Docker)
supabase start

# Check what it started
supabase status
```

This will output local URLs:

```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
```

Update `.env.local` to use these local URLs:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

Apply migrations locally:

```bash
supabase db reset  # Re-applies all migrations
```

---

## 4. Safety Rails

The code now includes environment detection helpers in [src/lib/env.ts](../src/lib/env.ts):

```typescript
import { IS_PROD, canSendExternalRequests, getEnvironment } from '@/lib/env';

// Example: Only send emails in production
if (canSendExternalRequests()) {
  await sendEmail(to, subject, body);
} else {
  console.log('[dev] Would send email:', { to, subject });
}

// Example: Log environment
console.log('Running in:', getEnvironment()); // 'production' | 'staging' | 'local'
```

### What to Gate in Non-Prod:

- ✅ Email sending (use console.log in dev/staging)
- ✅ Payment processing
- ✅ Webhooks to external services
- ✅ SMS/push notifications
- ✅ Analytics events (optional)

---

## 5. Migrations Workflow

**Golden Rule**: Always develop migrations locally, test in staging, then promote to production.

### Local Development

```bash
# Create a new migration
supabase migration new add_feature_x

# Edit the migration file in supabase/migrations/

# Apply locally
supabase db reset

# Or if using staging:
# Changes are already in staging DB
```

### Push to Staging

```bash
# Checkpoint
git add -A && git commit -m "checkpoint: before staging push"

# Push migrations to staging
supabase db push --project-ref <STAGING_REF>
```

### Promote to Production

After testing in staging:

```bash
# Checkpoint
git add -A && git commit -m "checkpoint: before prod migrations"

# Push migrations to production
supabase db push --project-ref <PROD_REF>
```

### Verify Migrations

Run sanity checks after each migration:

```sql
-- Check profiles table has expected columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check recent migrations
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 5;
```

---

## 6. Vercel Preview Builds (PR Workflow)

### Create a Feature Branch

```bash
# Create and switch to feature branch
git switch -c feat/add-feature-x

# Make your changes
# ...

# Commit and push
git add -A
git commit -m "feat: add feature x"
git push -u origin feat/add-feature-x
```

### Open a Pull Request

1. Go to GitHub
2. Open a Pull Request from `feat/add-feature-x` to `main`
3. Vercel will automatically create a **Preview** deployment
4. Preview uses staging environment variables (from Step 2.2)

### Verify Preview Build

Once deployed, test these URLs:

```bash
# Health check (should show environment: 'staging')
https://<preview-url>/api/health

# Environment check (should show ok: true)
https://<preview-url>/api/env-check
```

Expected response from `/api/health`:

```json
{
  "envOk": true,
  "dbOk": true,
  "error": null,
  "environment": "staging",
  "siteUrl": "https://<preview-url>.vercel.app",
  "isProd": false,
  "isStaging": true,
  "isLocal": false,
  "supabaseUrl": "https://<STAGING_REF>.supabase..."
}
```

---

## 7. Testing Strategy (Optional)

### E2E Tests with Playwright

```bash
# Install Playwright
npx playwright install

# Generate tests against local
npx playwright codegen http://localhost:3000

# Run tests
npx playwright test

# Run tests against staging/preview
PLAYWRIGHT_BASE_URL=https://<preview-url> npx playwright test
```

### Manual Testing Checklist

For each PR preview:

- [ ] `/api/health` shows correct environment
- [ ] User can sign up with test account
- [ ] OAuth flows work correctly
- [ ] Database queries return expected data
- [ ] No console errors

---

## 8. Backups

### Production Backups

Your existing nightly backup workflow continues unchanged:
`.github/workflows/supabase-nightly-backup.yml`

### Staging Backups

Staging doesn't need backups - you can always:

```bash
# Reset staging to latest migrations
supabase db push --project-ref <STAGING_REF>

# Or restore from production schema
pg_dump "$PROD_DATABASE_URL" --schema-only | psql "$STAGING_DATABASE_URL"
```

---

## 9. Quick Reference Commands

```bash
# Local: Apply migrations
supabase db reset

# Staging: Push migrations
git add -A && git commit -m "checkpoint: staging push"
supabase db push --project-ref <STAGING_REF>

# Production: Push migrations (after testing staging)
git add -A && git commit -m "checkpoint: prod push"
supabase db push --project-ref <PROD_REF>

# Create feature branch and PR
git switch -c feat/my-feature
git push -u origin feat/my-feature
# Then open PR on GitHub

# Deploy to production (after PR merged)
# Vercel auto-deploys main branch
```

---

## 10. Troubleshooting

### Preview build shows "production" environment

- Check Vercel Preview environment variables
- Ensure `NEXT_PUBLIC_SITE_URL` is NOT set to `certifiedsliders.com`

### Database connection fails

- Verify database password is correct
- Check IP allowlist in Supabase (should allow all for development)
- Verify connection string format

### Migrations fail to apply

```bash
# Check migration history
supabase db remote history --project-ref <REF>

# Manually fix via SQL
psql "postgresql://..." -f supabase/migrations/<file>.sql
```

### Local Supabase won't start

```bash
# Stop all
supabase stop

# Remove volumes and restart
docker volume prune
supabase start
```

---

## 11. Checklist: Definition of Done

- [x] Staging Supabase project created and migrations applied
- [x] Vercel Preview scope configured with staging credentials
- [x] `.env.staging.example` created with template
- [x] Local development uses staging or local Supabase
- [x] `/api/health` returns environment info
- [x] `/api/env-check` validates required env vars
- [x] Pull requests trigger Preview builds with staging data
- [ ] Google OAuth redirect URIs updated (add staging domain if needed)
- [x] Safety rails implemented (`canSendExternalRequests()`)
- [x] Nightly backup workflow running for production

---

## Your Credentials Placeholders

Replace these in your actual `.env.local` file:

- `<STAGING_REF>`: Your staging project ref (e.g., `abcdefghij`)
- `<PROD_REF>`: Your production project ref (e.g., `sczxkekhouglmvjoukdb`)
- `<STAGING_ANON_KEY>`: From Supabase staging project settings
- `<STAGING_SERVICE_ROLE_KEY>`: From Supabase staging project settings
- `<password>`: Your staging database password
- `<preview-url>`: Vercel preview URL (auto-generated per PR)

---

## Next Steps

1. **Create staging Supabase project** (Section 1)
2. **Configure Vercel Preview environment variables** (Section 2)
3. **Set up local `.env.local`** (Section 3)
4. **Create a test PR** to verify Preview builds work
5. **Update Google OAuth console** if needed (add staging redirect URIs)
