import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { archiveEvent } from "@/lib/archive/event-archive-service";
import { isR2Configured } from "@/lib/r2";

const MIGRATION_SECRET = process.env.CRON_SECRET || "dev-migration-secret";

/**
 * Admin-only endpoint to migrate soft-archived events to R2 archives
 * This is a one-time migration to convert legacy soft-archived events
 *
 * Call with: curl -X POST http://localhost:3000/api/admin/migrate-archives
 * Or in production: curl -X POST https://your-domain.com/api/admin/migrate-archives \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authorization (optional - use CRON_SECRET if set, otherwise allow in dev)
    const authHeader = req.headers.get("authorization");
    const isDev = process.env.NODE_ENV === "development";

    if (!isDev && MIGRATION_SECRET && authHeader !== `Bearer ${MIGRATION_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json(
        {
          error: "R2 storage is not configured. Please configure R2 environment variables.",
        },
        { status: 500 }
      );
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
      orderBy: { archivedAt: "desc" },
    });

    if (softArchivedEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No soft-archived events found. Migration already complete!",
        migratedCount: 0,
      });
    }

    let migratedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const migratedEvents: Array<{ id: string; title: string }> = [];

    // Migrate each event
    for (const event of softArchivedEvents) {
      try {
        // Check if already archived to R2
        const existingArchive = await prisma.eventArchive.findFirst({
          where: { originalEventId: event.id },
        });

        if (existingArchive) {
          // Already in R2, just delete from database
          await prisma.weddingEvent.delete({
            where: { id: event.id },
          });
          migratedCount++;
          migratedEvents.push({ id: event.id, title: event.title });
        } else {
          // Archive to R2 and then delete
          await archiveEvent(event.id, event.ownerId);

          // Delete from database (cascade deletes all relations)
          await prisma.weddingEvent.delete({
            where: { id: event.id },
          });

          migratedCount++;
          migratedEvents.push({ id: event.id, title: event.title });
        }
      } catch (error) {
        failedCount++;
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`${event.title}: ${errorMsg}`);
        console.error(
          `Failed to migrate event ${event.id} (${event.title}):`,
          error
        );
      }
    }

    const eventTitles = migratedEvents.map((e) => e.title).join(", ");

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${migratedCount} event(s) to R2 archives${
        failedCount > 0 ? ` (${failedCount} failed)` : ""
      }`,
      migratedCount,
      failedCount,
      events: migratedEvents,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
