# News Feature Archive (Removed 2025-11-06)

This directory contains components from the old news feature that was removed during the admin dashboard redesign.

## Why This Was Removed

The news feature had two implementations:
1. **Database-backed news** (`news_items` table) - Admin-created news items stored in Supabase
2. **RSS feed integration** - External RSS feeds merged and displayed on public pages

Both were removed because:
- The admin home page was redesigned to focus on metrics and quick actions rather than news management
- External RSS feeds would dilute focus from the platform's core purpose: showcasing athletes
- The internal blog already serves as the primary news/content section
- The news feature was from early versions and no longer aligned with current product direction

## Archived Components

### Admin Components
- `admin/home/NewsListClient.tsx` - Client component for displaying and deleting news items
- `admin/home/NewsForm.tsx` - Form for creating new news items

### Public Components
- `components/home/NewsFeed.tsx` - Server component displaying database news items
- `components/home/NewsMergedGrid.tsx` - Grid layout for merged RSS feeds (4 cards)
- `components/news-grid.tsx` - Grid layout for merged RSS feeds (8 cards)
- `components/news-feed.tsx` - List layout for merged RSS feeds (6 items)
- `components/news-merged-grid.tsx` - Alternative grid implementation with dark mode

## Database Schema

The `news_items` table was also dropped as part of this cleanup. See migration: `20251107000001_drop_news_items.sql`

## Restoration Instructions

If you need to restore this feature:

1. Copy the components back to their original locations in `src/`
2. Restore the `news_items` table schema (check git history for the original migration)
3. Add server actions for creating/deleting news items in `src/app/(protected)/admin/home/actions.ts`
4. Re-integrate the RSS feed utility from `@/lib/rss`
5. Update admin home page to include NewsForm and NewsListClient

## Related Code

The RSS feed integration code may still exist in:
- `src/lib/rss.ts` - RSS feed fetching and merging utilities
- Server actions in admin pages

These were not archived since they might be used elsewhere or could be useful for future features.
