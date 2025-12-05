import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getJobStatus } from "@/lib/bulk-messaging/job-processor";

export async function GET(
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

    const status = await getJobStatus(jobId);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error("Error getting job status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get job status" },
      { status: 500 }
    );
  }
}
