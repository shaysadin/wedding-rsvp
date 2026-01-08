import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { cancelBulkJob } from "@/lib/bulk-messaging/job-processor";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
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

    // Cancel the job
    await cancelBulkJob(jobId);

    return NextResponse.json({
      success: true,
      message: "Job cancelled successfully",
    });
  } catch (error: any) {
    console.error("Error cancelling job:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel job" },
      { status: 500 }
    );
  }
}
