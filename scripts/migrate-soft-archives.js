/**
 * Migration script to convert all soft-archived events to R2 archives
 * Run once to clean up legacy soft-archived events
 *
 * NOTE: This script uses the app's server actions, so it needs to be run via tsx:
 * npx tsx scripts/migrate-soft-archives.ts
 *
 * Or you can manually archive events from the admin panel.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateSoftArchives() {
  try {
    console.log('🔍 Checking for soft-archived events...\n');

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

    console.log(`Found ${softArchivedEvents.length} soft-archived events:\n`);
    softArchivedEvents.forEach((event, i) => {
      console.log(`${i + 1}. ${event.title} (ID: ${event.id})`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('⚠️  MANUAL ACTION REQUIRED');
    console.log('='.repeat(60));
    console.log('\nThese events need to be migrated to R2 archives.');
    console.log('\nTo migrate, you have two options:');
    console.log('\n1. Use the admin panel to manually archive each event');
    console.log('2. Run the auto-close-events cron job to archive all events:');
    console.log('   curl -X GET http://localhost:3000/api/cron/auto-close-events \\');
    console.log('     -H "Authorization: Bearer YOUR_CRON_SECRET"');
    console.log('\n' + '='.repeat(60));
    console.log('\nEvent IDs to migrate:');
    softArchivedEvents.forEach((event) => {
      console.log(`  - ${event.id} (${event.title})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run check
migrateSoftArchives().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
