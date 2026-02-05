import { NextRequest, NextResponse } from "next/server";
import { CronJobStatus, CronJobType } from "@prisma/client";

import { prisma } from "@/lib/db";

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

    // Update all events to isArchived = true and isActive = false
    const result = await prisma.weddingEvent.updateMany({
      where: {
        id: { in: eventsToArchive.map((e) => e.id) },
      },
      data: {
        isArchived: true,
        isActive: false,
      },
    });

    const eventTitles = eventsToArchive.map((e) => e.title).join(", ");
    await logCronJob({
      status: CronJobStatus.SUCCESS,
      message: `Auto-archived ${result.count} event(s): ${eventTitles}`,
    });

    return NextResponse.json({
      success: true,
      message: `Auto-archived ${result.count} event(s)`,
      archivedCount: result.count,
      events: eventsToArchive.map((e) => ({
        id: e.id,
        title: e.title,
        dateTime: e.dateTime,
      })),
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
