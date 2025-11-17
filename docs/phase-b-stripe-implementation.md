# Phase B - Stripe Premium Scaffolding

**Status**: ✅ Complete
**Date**: 2025-11-14
**Branch**: main

---

## Overview

Phase B implements Stripe subscription infrastructure for the Coach Portal, enabling tiered subscriptions with feature gating, payment processing, and analytics for premium users.

---

## What Was Implemented

### 1. Stripe Integration ✅

**Files Created:**
- [src/lib/stripe/server.ts](../src/lib/stripe/server.ts) - Server-side Stripe utilities
- [src/app/api/webhooks/stripe/route.ts](../src/app/api/webhooks/stripe/route.ts) - Webhook handler
- [src/app/api/coach/upgrade/route.ts](../src/app/api/coach/upgrade/route.ts) - Upgrade/checkout API

**Features:**
- Stripe SDK configured with TypeScript support
- Checkout session creation for subscription upgrades
- Billing portal integration for subscription management
- Webhook handling for subscription lifecycle events:
  - `checkout.session.completed` - New subscription created
  - `customer.subscription.updated` - Subscription status changed
  - `customer.subscription.deleted` - Subscription canceled

**Pricing:**
- **Free Tier**: $0/month - 10 CSV exports, no analytics
- **Premium Tier**: $49/month - Unlimited exports, analytics, priority support
- **Enterprise Tier**: Custom pricing (placeholder for future)

### 2. Feature Gating & Entitlements ✅

**Files Created:**
- [src/lib/entitlements.ts](../src/lib/entitlements.ts) - Server-side entitlement helpers
- [src/lib/entitlements-shared.ts](../src/lib/entitlements-shared.ts) - Shared types/utilities

**Features:**
- Server-side helpers for checking program entitlements
- Client-safe utilities for UI rendering
- Type-safe feature flags:
  - `csv_export_limit` - Row limit for CSV exports
  - `analytics_enabled` - Access to analytics dashboard
  - `see_all_athletes` - View all athletes (future)
  - `priority_support` - Priority support access

**CSV Export Limits:**
- Already implemented in Phase A
- Free tier: 10 rows max
- Premium tier: Unlimited (999,999 rows)
- Enforced in [src/app/api/coach/export-csv/route.ts](../src/app/api/coach/export-csv/route.ts)

### 3. Analytics Dashboard ✅

**Files Created:**
- [supabase/migrations/20251114000000_coach_portal_analytics.sql](../supabase/migrations/20251114000000_coach_portal_analytics.sql) - Materialized view + RPCs
- [src/app/(protected)/coach/portal/analytics/page.tsx](../src/app/(protected)/coach/portal/analytics/page.tsx) - Analytics page

**Database Objects:**
- `mv_coach_analytics` - Materialized view with aggregated stats by program + class year
- `rpc_get_program_analytics()` - Premium-gated RPC to fetch analytics
- `rpc_get_program_stats_summary()` - Overall stats (available to all tiers)
- `refresh_coach_analytics()` - Function to refresh the materialized view

**Analytics Metrics:**
- Total interested athletes
- Total commitments
- Verified athletes count
- High-star athletes (4-5★)
- Average star rating
- Breakdown by class year:
  - Interested count
  - High stars count
  - Verified count
  - Commits count
  - States represented
  - Athletes who shared contact

**Access Control:**
- Premium tier required
- RPC enforces tier check before returning data
- Non-premium users see upgrade prompt

### 4. UI Components ✅

**Files Created:**
- [src/components/coach/UpgradeCard.tsx](../src/components/coach/UpgradeCard.tsx) - Subscription management UI

**Files Modified:**
- [src/app/(protected)/coach/portal/page.tsx](../src/app/(protected)/coach/portal/page.tsx) - Added navigation tabs
- [src/app/(protected)/coach/portal/analytics/page.tsx](../src/app/(protected)/coach/portal/analytics/page.tsx) - Added navigation tabs

**Features:**
- Tier badge display (Free/Premium/Enterprise)
- "Upgrade to Premium" button for free tier
- "Manage Billing" button for premium tier
- Feature comparison list
- Navigation tabs between Athletes and Analytics pages

### 5. Environment Variables ✅

**File Modified:**
- [.env.local.template](./.env.local.template)

**New Variables:**
```bash
STRIPE_SECRET_KEY=sk_test_your-test-key-here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-publishable-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here
STRIPE_PREMIUM_PRICE_ID=price_your-premium-price-id
```

### 6. Dependencies ✅

**Added Packages:**
- `stripe` - Stripe Node.js SDK
- `@stripe/stripe-js` - Stripe.js for client-side

---

## Database Changes

### New Migration

**File**: `supabase/migrations/20251114000000_coach_portal_analytics.sql`

**Objects Created:**
1. **Materialized View**: `mv_coach_analytics`
   - Aggregates interested athletes by program + class year
   - Includes counts for high stars, verified, commits, etc.
   - Refreshed via `refresh_coach_analytics()` function

2. **RPC Functions**:
   - `rpc_get_program_analytics(_program_id)` - Get analytics (premium-gated)
   - `rpc_get_program_stats_summary(_program_id)` - Get summary stats (all tiers)
   - `refresh_coach_analytics()` - Refresh materialized view

**Existing Tables Used:**
- `program_entitlements` (created in Phase A migration `20251109000003_coach_portal_entitlements.sql`)
- `athlete_college_interests`
- `profiles`

---

## API Routes

### `/api/coach/upgrade` (POST)

**Purpose**: Create Stripe checkout session or billing portal session

**Request Body**:
```json
{
  "program_id": "uuid",
  "action": "manage" // Optional: open billing portal for existing customers
}
```

**Response**:
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

**Security:**
- Requires authentication
- Only coordinators/admins can manage billing
- Verifies program membership

### `/api/webhooks/stripe` (POST)

**Purpose**: Handle Stripe webhook events

**Events Handled:**
- `checkout.session.completed` - Upgrade program to premium
- `customer.subscription.updated` - Update tier based on status
- `customer.subscription.deleted` - Downgrade to free tier

**Security:**
- Verifies webhook signature
- Uses service role key for database updates
- Logs all actions to `audit_log`

---

## User Flows

### Upgrade Flow

1. **Free tier coach** clicks "Upgrade to Premium" in UpgradeCard component
2. Client calls `/api/coach/upgrade` with `program_id`
3. API creates Stripe checkout session
4. User redirected to Stripe checkout
5. User completes payment
6. Stripe sends `checkout.session.completed` webhook
7. Webhook handler upgrades program to premium in `program_entitlements`
8. Coach redirected to `/coach/portal?upgrade=success`
9. Coach now has access to analytics and unlimited exports

### Manage Billing Flow

1. **Premium coach** clicks "Manage Billing" in UpgradeCard
2. Client calls `/api/coach/upgrade` with `action: "manage"`
3. API creates Stripe billing portal session
4. User redirected to Stripe billing portal
5. User can update payment method, cancel subscription, etc.
6. Changes trigger webhooks (`subscription.updated`, `subscription.deleted`)
7. Webhook handler updates tier accordingly

### Analytics Access Flow

1. Coach navigates to `/coach/portal/analytics`
2. Page fetches `program_entitlements` for active program
3. If `analytics_enabled = false`: Show upgrade prompt
4. If `analytics_enabled = true`: Call `rpc_get_program_analytics()`
5. Display analytics dashboard with stats and class year breakdown

---

## Testing Checklist

### Stripe Integration
- [ ] Add Stripe API keys to environment (test mode)
- [ ] Create premium price in Stripe Dashboard
- [ ] Add `STRIPE_PREMIUM_PRICE_ID` to environment
- [ ] Test upgrade flow (use test card `4242 4242 4242 4242`)
- [ ] Verify program tier changes to Premium after payment
- [ ] Test webhook handling (use Stripe CLI for local testing)
- [ ] Test billing portal access for existing customers
- [ ] Test subscription cancellation (verify downgrade to free)

### Feature Gating
- [ ] Verify free tier limited to 10 CSV export rows
- [ ] Verify premium tier gets unlimited CSV exports
- [ ] Verify analytics page blocked for free tier
- [ ] Verify analytics page accessible for premium tier

### Analytics Dashboard
- [ ] Run migration: `supabase db push`
- [ ] Refresh materialized view: `SELECT refresh_coach_analytics();`
- [ ] Verify analytics data displays correctly
- [ ] Verify class year breakdown shows accurate counts
- [ ] Verify summary stats (total interested, commits, etc.)

### UI/UX
- [ ] Verify UpgradeCard displays correct tier
- [ ] Verify navigation tabs work between Athletes and Analytics
- [ ] Verify upgrade prompt shows on analytics page for free tier
- [ ] Verify tier badges display correctly (Free/Premium/Enterprise)

---

## Stripe Webhook Setup

### Local Development

1. Install Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. Copy webhook signing secret from CLI output and add to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Production Setup

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://certifiedsliders.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook signing secret
5. Add to Vercel environment variables:
   ```bash
   vercel env add STRIPE_WEBHOOK_SECRET production
   ```

---

## Security Considerations

1. **API Key Management**:
   - Never commit Stripe keys to git
   - Use environment variables for all keys
   - Use test mode keys for development

2. **Webhook Security**:
   - Always verify webhook signatures
   - Use service role key for database updates (bypasses RLS)
   - Log all webhook events to `audit_log`

3. **Feature Gating**:
   - Always check entitlements server-side (never trust client)
   - Use RPC functions with `SECURITY DEFINER` for tier checks
   - Enforce limits in API routes, not just UI

4. **Billing Access**:
   - Only coordinators/admins can manage billing (not regular coaches)
   - Verify program membership before creating checkout sessions

---

## Future Enhancements

1. **Email Notifications**:
   - Send confirmation email after successful upgrade
   - Send cancellation email after subscription ends
   - Send reminder before subscription renewal

2. **Annual Billing**:
   - Add annual subscription option (discounted)
   - Create second Stripe price ID for annual plan

3. **Team Seats**:
   - Allow purchasing additional coach seats
   - Multi-coach access to same program

4. **Enterprise Tier**:
   - Custom pricing via Stripe quotes
   - Advanced analytics (historical trends, comparisons)
   - Dedicated support channel

5. **Trial Period**:
   - Add 14-day free trial for premium features
   - Configure in Stripe subscription settings

---

## Known Issues

None at this time. Build successful ✅

---

## Rollback Plan

If issues arise, rollback steps:

1. **Disable Stripe Integration**:
   ```bash
   # Remove Stripe keys from environment
   vercel env rm STRIPE_SECRET_KEY production
   vercel env rm STRIPE_WEBHOOK_SECRET production
   ```

2. **Hide UI Components**:
   ```tsx
   // Comment out UpgradeCard in coach portal
   // Comment out Analytics link in navigation
   ```

3. **Revert Migration** (if needed):
   ```sql
   DROP MATERIALIZED VIEW IF EXISTS mv_coach_analytics CASCADE;
   DROP FUNCTION IF EXISTS rpc_get_program_analytics(uuid);
   DROP FUNCTION IF EXISTS rpc_get_program_stats_summary(uuid);
   DROP FUNCTION IF EXISTS refresh_coach_analytics();
   ```

4. **Restore Free Tier for All**:
   ```sql
   UPDATE program_entitlements SET tier = 0, features = jsonb_build_object(
     'csv_export_limit', 10,
     'analytics_enabled', false,
     'see_all_athletes', false,
     'priority_support', false
   );
   ```

---

## References

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Node.js SDK](https://github.com/stripe/stripe-node)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Supabase Materialized Views](https://supabase.com/docs/guides/database/materialized-views)

---

**Phase B Implementation Complete** ✅
