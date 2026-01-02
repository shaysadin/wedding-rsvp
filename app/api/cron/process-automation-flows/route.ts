import { NextRequest, NextResponse } from "next/server";

import {
  processAutomationFlows,
  scheduleUpcomingEventTriggers,
  cleanupOldExecutions,
} from "@/lib/automation/flow-processor";

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  try {
    // Verify the request is from Vercel Cron or has the correct secret
    const authHeader = req.headers.get("authorization");

    // In production, verify the cron secret
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Schedule upcoming event triggers (EVENT_MORNING, HOURS_BEFORE_EVENT_2)
    const scheduled = await scheduleUpcomingEventTriggers();

    // 2. Process pending automation flow executions
    const result = await processAutomationFlows();

    // 3. Clean up old executions (once a day, check if hour is 3 AM)
    let cleaned = 0;
    const now = new Date();
    if (now.getHours() === 3) {
      cleaned = await cleanupOldExecutions(30);
    }

    return NextResponse.json({
      success: true,
      message: "Automation flows processed",
      scheduled,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
      cleaned,
    });
  } catch (error: any) {
    console.error("Error processing automation flows:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process automation flows" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(req: NextRequest) {
  return GET(req);
}
