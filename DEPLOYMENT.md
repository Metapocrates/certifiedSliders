# Production Deployment Plan

## Overview
This document outlines the deployment process for Certified Sliders from development to production.

**Date:** November 9, 2025
**Version:** v1.0.0 (Initial Production Release)
**Git Commit:** `44a29a1` (latest on main)

---

## Recent Features Deployed

### 1. Featured Athletes Carousel
- **What:** Homepage carousel showing 3-5 star athletes (manually featured + random selection)
- **Files Modified:**
  - `src/components/home/FeaturedProfilesCarousel.tsx` - Main carousel component
  - `src/components/home/FeaturedProfiles.tsx` - Alternative profile component
  - `src/app/(protected)/admin/featured/page.tsx` - Admin management UI
  - `src/app/(protected)/admin/featured/FeaturedForm.tsx` - Form with two-tier dropdown
  - `src/app/(protected)/admin/featured/actions.ts` - Server actions for featuring

### 2. User Type System
- **What:** Registration flow with user type selection (athlete, ncaa_coach, parent, hs_coach)
- **Migration:** `20251109000005_user_types.sql`

### 3. College Interests Fix
- **What:** Fixed infinite recursion when athletes add programs of interest
- **Migration:** `20251109000004_fix_college_interests_recursion.sql`

### 4. Video Upload Improvements
- **What:** Image upload UI for blog posts, video submission enhancements
- **Files:** Multiple video-related components

---

## Pre-Deployment Checklist

### Code Review
- [ ] All features tested locally
- [ ] No console errors on homepage
- [ ] Admin pages accessible and functional
- [ ] User registration flow working (Google OAuth + Email)
- [ ] Featured carousel shows only 3-5 star athletes

### Database
- [ ] Production Supabase project created
- [ ] Production database URL available
- [ ] All migrations ready to apply (see below)

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` (production)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (production)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (production)
- [ ] `DATABASE_URL` (production connection string)
- [ ] All other env vars documented in `.env.example`

### Hosting Platform
- [ ] Vercel project connected to GitHub
- [ ] Auto-deploy from `main` branch enabled (optional)
- [ ] Custom domain configured (if applicable)

---

## Database Migrations to Apply

**IMPORTANT:** Apply these migrations in order on production database.

### Required Migrations (2024-2025)

```bash
# Navigate to project root
cd /path/to/certifiedsliders

# Set production database URL
export PRODUCTION_DATABASE_URL="postgresql://..."

# Apply all migrations
npx supabase db push --db-url $PRODUCTION_DATABASE_URL
```

### Key Migrations List

1. **20251109000001_coach_portal_notifications.sql**
   - Coach portal notification system

2. **20251109000002_coach_portal_rate_limit.sql**
   - Rate limiting for coach actions

3. **20251109000003_coach_portal_entitlements.sql**
   - Coach subscription/entitlement system

4. **20251109000004_fix_college_interests_recursion.sql**
   - ⚠️ CRITICAL: Fixes infinite recursion bug
   - Creates `count_athlete_interests()` SECURITY DEFINER function
   - Updates `aci_limit_10_programs` policy

5. **20251109000005_user_types.sql**
   - User type classification system
   - Adds `user_type` column to profiles

6. **20251109000006_add_featured_column.sql**
   - ⚠️ CRITICAL: Required for featured athletes
   - Adds `featured` boolean column to profiles
   - Creates index for featured profile queries

### Verify Migrations Applied

```bash
# Check migration status
npx supabase migration list --db-url $PRODUCTION_DATABASE_URL

# Verify featured column exists
psql $PRODUCTION_DATABASE_URL -c "\d profiles" | grep featured

# Should show:
# featured | boolean | default false
```

---

## Deployment Steps

### Option A: Manual Deployment (Recommended for first deploy)

```bash
# 1. Ensure all changes are committed and pushed
git status
git push origin main

# 2. Apply database migrations (see above)
npx supabase db push --db-url $PRODUCTION_DATABASE_URL

# 3. Deploy to Vercel
vercel --prod

# Or if using Vercel auto-deploy, just push to main
# Deployment happens automatically
```

### Option B: Automatic Deployment (if configured)

```bash
# Simply push to main branch
git push origin main

# Vercel auto-deploys
# Monitor at: https://vercel.com/your-project/deployments
```

---

## Post-Deployment Verification

### Critical Checks (Do these immediately after deploy)

1. **Homepage Loads**
   ```
   Visit: https://your-domain.com
   Check: Featured carousel appears
   Check: Only 3-5 star athletes shown (if any featured)
   Check: No console errors
   ```

2. **User Authentication**
   ```
   Test: Sign up with Google
   Test: Email/password login
   Test: User type selection in registration flow
   ```

3. **Admin Dashboard**
   ```
   Login as admin
   Visit: https://your-domain.com/admin
   Check: All admin pages accessible
   Check: Featured management works (/admin/featured)
   ```

4. **Database Connectivity**
   ```
   Check: Profile pages load
   Check: Athletes list populates
   Check: Results show correctly
   ```

### Feature-Specific Tests

**Featured Athletes:**
- [ ] Admin can mark 3-5 star athletes as featured
- [ ] Homepage carousel only shows 3-5 star athletes
- [ ] Random selection working (refresh page, see different athletes)
- [ ] Two-dropdown system works (Primary vs Optional)

**College Interests:**
- [ ] Athletes can add up to 10 programs
- [ ] No infinite recursion errors
- [ ] Programs save successfully

**User Types:**
- [ ] New users select user type during registration
- [ ] Correct permissions applied based on user type
- [ ] Coach portal accessible to coaches only

---

## Environment Variables Setup

### Vercel Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (KEEP SECRET!)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Next.js
NEXT_PUBLIC_APP_URL=https://certifiedsliders.com
NODE_ENV=production

# Optional: Analytics, monitoring, etc.
# Add your other services here
```

---

## Rollback Plan

If critical issues occur after deployment:

### Quick Rollback (Vercel)

```bash
# Option 1: Redeploy previous version via Vercel dashboard
# Go to Deployments → Select previous working deployment → Promote to Production

# Option 2: Git revert
git revert HEAD
git push origin main
# Vercel auto-deploys the reverted code
```

### Database Rollback (Use with caution!)

```bash
# Only if migrations caused issues
# Create a backup BEFORE reverting

# 1. Backup current state
pg_dump $PRODUCTION_DATABASE_URL > backup_before_rollback.sql

# 2. Revert specific migration (example)
psql $PRODUCTION_DATABASE_URL -c "DROP POLICY IF EXISTS aci_limit_10_programs ON public.athlete_college_interests;"

# 3. Re-apply old migration if needed
```

**⚠️ WARNING:** Database rollbacks are risky. Only do this if absolutely necessary and you have recent backups.

---

## Production Monitoring

### What to Watch After Deploy

1. **Error Tracking**
   - Check Vercel logs for errors
   - Monitor Supabase logs for database errors
   - Check browser console on production site

2. **Performance**
   - Homepage load time
   - Database query performance
   - API response times

3. **User Feedback**
   - Monitor for user reports of issues
   - Check admin notifications
   - Review registration success rate

### Helpful Commands

```bash
# View Vercel logs
vercel logs --prod

# Check recent deployments
vercel ls

# View build logs
vercel inspect [deployment-url]

# Database query monitoring (Supabase Dashboard)
# Go to: Database → Query Performance
```

---

## Known Issues & Limitations

### Current Production Limitations

1. **Featured Athletes**
   - Requires manual admin action to feature athletes
   - Random selection changes on each page refresh (by design)
   - Only athletes with profile pictures appear

2. **Database Performance**
   - Fisher-Yates shuffle happens server-side (could be optimized)
   - Consider caching featured athlete list if traffic increases

3. **Video Uploads**
   - Large file uploads may timeout (configure Vercel timeout if needed)
   - Supabase Storage limits apply

### Future Optimizations

- [ ] Add Redis caching for featured athletes
- [ ] Implement CDN for images
- [ ] Add monitoring/analytics (Sentry, Mixpanel, etc.)
- [ ] Set up automated backups
- [ ] Configure alerting for critical errors

---

## Support & Troubleshooting

### Common Issues

**Issue:** Featured carousel shows no athletes
**Solution:**
1. Check if any athletes have `featured=true` in database
2. Verify at least some athletes have 3-5 star ratings
3. Ensure `featured` column exists (run migration 20251109000006)

**Issue:** Infinite recursion on college interests
**Solution:** Verify migration 20251109000004 was applied successfully

**Issue:** Users can't register
**Solution:**
1. Check Supabase authentication settings
2. Verify Google OAuth is configured
3. Check email templates are set up

### Getting Help

- **Documentation:** Check `/docs` folder in repo
- **Logs:** Vercel dashboard or `vercel logs --prod`
- **Database:** Supabase Dashboard → Database → Logs
- **Support:** Create issue on GitHub repo

---

## Deployment History

### v1.0.0 - November 9, 2025 (Pending)
- Initial production release
- Featured athletes system
- User type classification
- College interests fix
- Video upload improvements

---

## Next Steps After Deployment

1. [ ] Monitor error logs for first 24 hours
2. [ ] Feature 3-5 athletes as test (/admin/featured)
3. [ ] Verify user registration is working
4. [ ] Set up production backups schedule
5. [ ] Configure domain/SSL if not already done
6. [ ] Set up monitoring/alerting
7. [ ] Document production URLs and credentials (securely!)

---

## Emergency Contacts

**Production URL:** https://your-production-url.com
**Vercel Dashboard:** https://vercel.com/your-team/certifiedsliders
**Supabase Dashboard:** https://app.supabase.com/project/your-project-id
**GitHub Repo:** https://github.com/Metapocrates/certifiedSliders

---

**Deployment Prepared By:** Claude Code
**Deployment Date:** [To be filled]
**Deployed By:** [Your name]
**Status:** ✅ Ready for Production
