# Soft-Archive Migration Guide

This guide explains how to migrate all soft-archived events to proper R2 archives.

## What Are Soft-Archived Events?

Soft-archived events are events marked as `isArchived=true` in the database but not yet moved to R2 storage. This is a legacy behavior that has been removed.

## New Archival Behavior

Going forward, all archival (manual or automatic) will:
1. Create a complete snapshot in R2 storage
2. Delete the event from the database
3. Keep the archive metadata in the `EventArchive` table for retrieval

## How to Migrate Existing Soft-Archived Events

### Option 1: Run Auto-Close Cron Job

The easiest way is to trigger the auto-close-events cron job, which will process all soft-archived events:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. In another terminal, run:
   ```bash
   curl -X GET http://localhost:3000/api/cron/auto-close-events
   ```

   Or with authentication (production):
   ```bash
   curl -X GET https://your-domain.com/api/cron/auto-close-events \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

### Option 2: Manual Migration Script

If you prefer to use the migration script:

1. Ensure R2 is configured in your `.env`:
   ```
   CLOUDFLARE_R2_ACCOUNT_ID=...
   CLOUDFLARE_R2_ACCESS_KEY_ID=...
   CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
   CLOUDFLARE_R2_BUCKET_NAME=...
   ```

2. Run the migration:
   ```bash
   npx tsx scripts/migrate-soft-archives.ts
   ```

### Option 3: Manual via Admin Panel

As a platform owner, you can manually archive events one by one from the dashboard.

## Checking Soft-Archived Events

To see how many soft-archived events you have:

```bash
node scripts/check-archives.js
```

This will show:
- R2 Archived events (fully archived)
- Soft-archived events (needs migration)

## What Changed

### Before (Soft-Archive):
- Manual archive: Created R2 snapshot, marked as `isArchived=true`, kept in DB
- Auto archive: Only marked as `isArchived=true`, no R2 snapshot
- Archives page: Showed both R2 and soft-archived events

### After (R2-Only):
- Manual archive: Creates R2 snapshot, deletes from DB
- Auto archive: Creates R2 snapshot, deletes from DB
- Archives page: Shows only R2-archived events
- Requires R2 to be configured (errors if not)

## Files Modified

1. **actions/events.ts** - `softArchiveEvent()` now requires R2 and deletes event
2. **actions/archives.ts** - `getMyArchives()` only queries `EventArchive` table
3. **app/api/cron/auto-close-events/route.ts** - Removed soft-archive fallback
4. **actions/workspaces.ts** - Workspace event counts now exclude archived events
