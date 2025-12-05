import { NextRequest, NextResponse } from "next/server";
import { UserRole, NotificationType } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createBulkJob, processJobChunk } from "@/lib/bulk-messaging/job-processor";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    const body = await req.json();
    const { eventId, messageType, guestIds } = body;

    if (!eventId || !messageType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate message type
    if (!Object.values(NotificationType).includes(messageType)) {
      return NextResponse.json(
        { error: "Invalid message type" },
        { status: 400 }
      );
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: userId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Create the bulk job
    const { jobId, totalGuests } = await createBulkJob(
      eventId,
      userId,
      messageType as NotificationType,
      guestIds
    );

    // Start processing the first chunk asynchronously
    // This won't block the response
    processJobChunk(jobId, 10).catch((error) => {
      console.error(`Error processing initial chunk for job ${jobId}:`, error);
    });

    return NextResponse.json({
      success: true,
      jobId,
      totalGuests,
      message: `Bulk message job created with ${totalGuests} guests`,
    });
  } catch (error: any) {
    console.error("Error starting bulk job:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start bulk job" },
      { status: 500 }
    );
  }
}
