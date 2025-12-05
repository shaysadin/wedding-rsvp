import { NextRequest, NextResponse } from "next/server";

import { getPendingJobs, processJobChunk } from "@/lib/bulk-messaging/job-processor";

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

    // Get all pending jobs
    const pendingJobIds = await getPendingJobs();

    if (pendingJobIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending jobs to process",
        processedJobs: 0,
      });
    }

    const results: {
      jobId: string;
      processed: number;
      success: number;
      failed: number;
      isComplete: boolean;
    }[] = [];

    // Process each job (one chunk at a time to stay within timeout)
    for (const jobId of pendingJobIds) {
      try {
        const result = await processJobChunk(jobId, 10);
        results.push({
          jobId,
          ...result,
        });

        // If this job isn't complete and we've processed some messages,
        // stop here to avoid timeout. The next cron run will continue.
        if (!result.isComplete && result.processed > 0) {
          break;
        }
      } catch (error: any) {
        console.error(`Error processing job ${jobId}:`, error);
        results.push({
          jobId,
          processed: 0,
          success: 0,
          failed: 0,
          isComplete: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} job(s)`,
      results,
    });
  } catch (error: any) {
    console.error("Error in cron job:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process bulk jobs" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(req: NextRequest) {
  return GET(req);
}
