/**
 * Migration Script: Assign Existing Events to Default Workspaces
 *
 * This script assigns all events that don't have a workspaceId
 * to their owner's default workspace.
 *
 * Run with: npx tsx scripts/migrate-events-to-workspaces.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateEventsToWorkspaces() {
  console.log("🚀 Starting events to workspaces migration...\n");

  try {
    // Find all events without a workspaceId
    const eventsWithoutWorkspace = await prisma.weddingEvent.findMany({
      where: {
        workspaceId: null,
      },
      select: {
        id: true,
        title: true,
        ownerId: true,
      },
    });

    console.log(`📊 Found ${eventsWithoutWorkspace.length} events without workspace assignment\n`);

    if (eventsWithoutWorkspace.length === 0) {
      console.log("✅ All events are already assigned to workspaces. Nothing to do!");
      return;
    }

    // Group events by owner
    const eventsByOwner = new Map<string, typeof eventsWithoutWorkspace>();
    for (const event of eventsWithoutWorkspace) {
      const ownerEvents = eventsByOwner.get(event.ownerId) || [];
      ownerEvents.push(event);
      eventsByOwner.set(event.ownerId, ownerEvents);
    }

    console.log(`👥 Events belong to ${eventsByOwner.size} different users\n`);

    let updated = 0;
    let failed = 0;

    for (const [ownerId, events] of eventsByOwner) {
      try {
        // Get or create default workspace for this owner
        let defaultWorkspace = await prisma.workspace.findFirst({
          where: {
            ownerId,
            isDefault: true,
          },
        });

        if (!defaultWorkspace) {
          // If no default, try to find any workspace
          defaultWorkspace = await prisma.workspace.findFirst({
            where: { ownerId },
          });
        }

        if (!defaultWorkspace) {
          // Should not happen since we ran the workspace migration first
          console.error(`❌ No workspace found for user ${ownerId}, skipping ${events.length} events`);
          failed += events.length;
          continue;
        }

        // Update all events for this owner
        const result = await prisma.weddingEvent.updateMany({
          where: {
            id: { in: events.map(e => e.id) },
            workspaceId: null,
          },
          data: {
            workspaceId: defaultWorkspace.id,
          },
        });

        updated += result.count;
        console.log(`✅ Assigned ${result.count} events to workspace "${defaultWorkspace.name}" for user ${ownerId}`);

      } catch (error) {
        failed += events.length;
        console.error(`❌ Failed to update events for user ${ownerId}:`, error);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`📊 Migration Complete!`);
    console.log(`   ✅ Updated: ${updated} events`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed} events`);
    }
    console.log("=".repeat(50));

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateEventsToWorkspaces()
  .then(() => {
    console.log("\n👋 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration error:", error);
    process.exit(1);
  });
