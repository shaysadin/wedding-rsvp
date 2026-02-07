import { NextRequest, NextResponse } from "next/server";
import { CronJobStatus, CronJobType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { archiveEvent } from "@/lib/archive/event-archive-service";
import { isR2Configured } from "@/lib/r2";

const CRON_SECRET = process.env.CRON_SECRET;

async function logCronJob(params: {
  status: CronJobStatus;
  message?: string;
  errorDetails?: string;
}) {
  try {
    await prisma.cronJobLog.create({
      data: {
        jobType: CronJobType.EVENT_AUTO_CLOSE,
        status: params.status,
        message: params.message,
        errorDetails: params.errorDetails,
      },
    });
  } catch (logError) {
    console.error("Failed to write cron job log:", logError);
  }
}

/**
 * Auto-close events cron job
 * Runs daily to archive events 1 week after their date has passed
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Find all non-archived events where dateTime was more than 1 week ago
    const eventsToArchive = await prisma.weddingEvent.findMany({
      where: {
        isArchived: false,
        dateTime: { lt: oneWeekAgo },
      },
      select: {
        id: true,
        title: true,
        dateTime: true,
        ownerId: true,
      },
    });

    if (eventsToArchive.length === 0) {
      await logCronJob({
        status: CronJobStatus.SUCCESS,
        message: "No events to auto-archive",
      });

      return NextResponse.json({
        success: true,
        message: "No events to auto-archive",
        archivedCount: 0,
      });
    }

    // Check if R2 is configured - REQUIRED for archiving
    const r2Available = isR2Configured();

    if (!r2Available) {
      const errorMessage = "Cannot auto-archive events: R2 storage is not configured. Please configure R2 environment variables.";

      await logCronJob({
        status: CronJobStatus.FAILED,
        message: `Found ${eventsToArchive.length} event(s) to archive but R2 is not configured`,
        errorDetails: errorMessage,
      });

      return NextResponse.json({
        success: false,
        error: errorMessage,
        eventsToArchive: eventsToArchive.length,
      }, { status: 500 });
    }

    let archivedCount = 0;
    let failedCount = 0;
    const archivedEvents: Array<{ id: string; title: string }> = [];
    const errors: string[] = [];

    // Archive each event to R2 and delete from database
    for (const event of eventsToArchive) {
      try {
        // Archive to R2 storage and create archive record
        await archiveEvent(event.id, event.ownerId);

        // Delete the event from the database (all related data will cascade delete)
        await prisma.weddingEvent.delete({
          where: { id: event.id },
        });

        archivedCount++;
        archivedEvents.push({ id: event.id, title: event.title });
      } catch (error) {
        failedCount++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push(`${event.title}: ${errorMsg}`);
        console.error(`Failed to archive event ${event.id} (${event.title}):`, error);
      }
    }

    const eventTitles = archivedEvents.map((e) => e.title).join(", ");
    const message = `Archived ${archivedCount} event(s) to R2 storage and deleted from database: ${eventTitles}`;

    await logCronJob({
      status: failedCount === 0 ? CronJobStatus.SUCCESS : CronJobStatus.FAILED,
      message: `${message}${failedCount > 0 ? ` (${failedCount} failed)` : ""}`,
      errorDetails: errors.length > 0 ? errors.join("; ") : undefined,
    });

    return NextResponse.json({
      success: true,
      message,
      archivedCount,
      failedCount,
      r2Available,
      events: archivedEvents,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    console.error("Error in auto-close-events cron:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logCronJob({
      status: CronJobStatus.FAILED,
      errorDetails: errorMessage,
    });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req);
}
