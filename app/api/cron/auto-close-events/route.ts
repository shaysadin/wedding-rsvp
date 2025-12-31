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
 * Runs daily to mark events as inactive when their date has passed
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find all active events where dateTime has passed
    const eventsToClose = await prisma.weddingEvent.findMany({
      where: {
        isActive: true,
        dateTime: { lt: now },
      },
      select: {
        id: true,
        title: true,
        dateTime: true,
        ownerId: true,
      },
    });

    if (eventsToClose.length === 0) {
      await logCronJob({
        status: CronJobStatus.SUCCESS,
        message: "No events to auto-close",
      });

      return NextResponse.json({
        success: true,
        message: "No events to auto-close",
        closedCount: 0,
      });
    }

    // Update all events to isActive = false
    const result = await prisma.weddingEvent.updateMany({
      where: {
        id: { in: eventsToClose.map((e) => e.id) },
      },
      data: {
        isActive: false,
      },
    });

    const eventTitles = eventsToClose.map((e) => e.title).join(", ");
    await logCronJob({
      status: CronJobStatus.SUCCESS,
      message: `Auto-closed ${result.count} event(s): ${eventTitles}`,
    });

    return NextResponse.json({
      success: true,
      message: `Auto-closed ${result.count} event(s)`,
      closedCount: result.count,
      events: eventsToClose.map((e) => ({
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
