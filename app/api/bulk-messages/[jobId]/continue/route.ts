import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { processJobChunk } from "@/lib/bulk-messaging/job-processor";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    // Verify job ownership
    const job = await prisma.bulkMessageJob.findFirst({
      where: {
        id: jobId,
        createdBy: user.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Process the next chunk
    const result = await processJobChunk(jobId, 10);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      successCount: result.success,
      failed: result.failed,
      isComplete: result.isComplete,
    });
  } catch (error: any) {
    console.error("Error continuing job:", error);
    return NextResponse.json(
      { error: error.message || "Failed to continue job" },
      { status: 500 }
    );
  }
}
