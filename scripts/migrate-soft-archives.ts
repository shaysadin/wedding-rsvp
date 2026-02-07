/**
 * Migration script to convert all soft-archived events to R2 archives
 * Run with: npx tsx scripts/migrate-soft-archives.ts
 */

import { PrismaClient } from '@prisma/client';
import { archiveEvent } from '../lib/archive/event-archive-service';
import { isR2Configured } from '../lib/r2';

const prisma = new PrismaClient();

async function migrateSoftArchives() {
  try {
    console.log('🔍 Checking for soft-archived events...\n');

    // Check R2 configuration
    if (!isR2Configured()) {
      console.error('❌ Error: R2 storage is not configured!');
      console.error('Please configure R2 environment variables before running this migration.');
      process.exit(1);
    }

    // Find all soft-archived events
    const softArchivedEvents = await prisma.weddingEvent.findMany({
      where: { isArchived: true },
      select: {
        id: true,
        title: true,
        ownerId: true,
        archivedAt: true,
      },
      orderBy: { archivedAt: 'desc' },
    });

    if (softArchivedEvents.length === 0) {
      console.log('✅ No soft-archived events found. Migration complete!');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found ${softArchivedEvents.length} soft-archived events to migrate:\n`);
    softArchivedEvents.forEach((event, i) => {
      console.log(`${i + 1}. ${event.title} (ID: ${event.id})`);
    });

    console.log('\n📦 Starting migration to R2 archives...\n');

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const event of softArchivedEvents) {
      try {
        console.log(`Processing: ${event.title}...`);

        // Check if already archived to R2
        const existingArchive = await prisma.eventArchive.findFirst({
          where: { originalEventId: event.id },
        });

        if (existingArchive) {
          console.log(`  ⚠️  Already archived to R2, deleting from database...`);
          // Just delete the event from database
          await prisma.weddingEvent.delete({
            where: { id: event.id },
          });
          successCount++;
          console.log(`  ✅ Deleted from database\n`);
        } else {
          // Archive to R2 and then delete
          console.log(`  📦 Creating R2 archive...`);
          await archiveEvent(event.id, event.ownerId);

          // Delete the event from database (cascade deletes all relations)
          console.log(`  🗑️  Deleting from database...`);
          await prisma.weddingEvent.delete({
            where: { id: event.id },
          });

          successCount++;
          console.log(`  ✅ Archived to R2 and deleted from database\n`);
        }
      } catch (error) {
        failedCount++;
        const errorMsg = `${event.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`  ❌ Failed: ${error instanceof Error ? error.message : error}\n`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Failed: ${failedCount}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    }

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateSoftArchives().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
