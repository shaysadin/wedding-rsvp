import {
  BulkMessageJob,
  BulkMessageJobItem,
  Guest,
  NotificationStatus,
  BulkJobStatus,
  NotificationType,
  WeddingEvent,
} from "@prisma/client";

import { prisma } from "@/lib/db";
import { getNotificationService } from "@/lib/notifications";
import { getTemplateForSending } from "@/actions/message-templates";
import { env } from "@/env.mjs";

// Rate limiting configuration
const RATE_LIMITS = {
  WHATSAPP: {
    messagesPerSecond: 1, // Conservative start
    batchSize: 10,
    delayBetweenBatches: 10000, // 10 seconds
  },
  SMS: {
    messagesPerSecond: 1,
    batchSize: 10,
    delayBetweenBatches: 10000,
  },
};

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  backoffMs: [5000, 15000, 60000], // 5s, 15s, 1min
};

// Helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Render a template with actual values
function renderTemplate(
  template: string,
  guest: Guest,
  event: WeddingEvent,
  rsvpLink: string
): string {
  return template
    .replace(/\{\{guestName\}\}/g, guest.name)
    .replace(/\{\{eventTitle\}\}/g, event.title)
    .replace(/\{\{rsvpLink\}\}/g, rsvpLink)
    .replace(/\{\{eventDate\}\}/g, event.dateTime.toLocaleDateString("he-IL"))
    .replace(/\{\{eventTime\}\}/g, event.dateTime.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }))
    .replace(/\{\{eventLocation\}\}/g, event.location)
    .replace(/\{\{eventVenue\}\}/g, event.venue || event.location);
}

// Get RSVP link for a guest
function getRsvpLink(guestSlug: string): string {
  return `${env.NEXT_PUBLIC_APP_URL}/rsvp/${guestSlug}`;
}

// Process a single message item
async function processItem(
  item: BulkMessageJobItem & { guest: Guest },
  job: BulkMessageJob & { weddingEvent: WeddingEvent },
  templateMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const rsvpLink = getRsvpLink(item.guest.slug);
    const renderedMessage = renderTemplate(
      templateMessage,
      item.guest,
      job.weddingEvent,
      rsvpLink
    );

    // Get the appropriate notification service (real or mock based on config)
    const notificationService = await getNotificationService();

    // Use the notification service to send
    let result;
    if (job.messageType === NotificationType.INVITE) {
      result = await notificationService.sendInvite(item.guest, job.weddingEvent);
    } else if (job.messageType === NotificationType.REMINDER) {
      result = await notificationService.sendReminder(item.guest, job.weddingEvent);
    } else {
      throw new Error(`Unsupported message type: ${job.messageType}`);
    }

    if (result.success) {
      // Update item as sent
      await prisma.bulkMessageJobItem.update({
        where: { id: item.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          attempts: item.attempts + 1,
        },
      });

      // Create notification log
      await prisma.notificationLog.create({
        data: {
          guestId: item.guestId,
          type: job.messageType,
          channel: result.channel,
          status: result.status,
          providerResponse: result.providerResponse,
          sentAt: new Date(),
        },
      });

      return { success: true };
    } else {
      throw new Error(result.error || "Failed to send message");
    }
  } catch (error: any) {
    // Update item as failed
    await prisma.bulkMessageJobItem.update({
      where: { id: item.id },
      data: {
        status:
          item.attempts + 1 >= RETRY_CONFIG.maxAttempts
            ? NotificationStatus.FAILED
            : NotificationStatus.PENDING,
        attempts: item.attempts + 1,
        errorMessage: error.message,
      },
    });

    return { success: false, error: error.message };
  }
}

// Update job progress counters
async function updateJobProgress(jobId: string): Promise<void> {
  const counts = await prisma.bulkMessageJobItem.groupBy({
    by: ["status"],
    where: { jobId },
    _count: { status: true },
  });

  const statusCounts = counts.reduce((acc, item) => {
    acc[item.status] = item._count.status;
    return acc;
  }, {} as Record<NotificationStatus, number>);

  const processedCount =
    (statusCounts[NotificationStatus.SENT] || 0) +
    (statusCounts[NotificationStatus.FAILED] || 0);
  const successCount = statusCounts[NotificationStatus.SENT] || 0;
  const failedCount = statusCounts[NotificationStatus.FAILED] || 0;

  await prisma.bulkMessageJob.update({
    where: { id: jobId },
    data: {
      processedCount,
      successCount,
      failedCount,
    },
  });
}

// Check if job is complete and update status
async function checkJobCompletion(jobId: string): Promise<boolean> {
  const job = await prisma.bulkMessageJob.findUnique({
    where: { id: jobId },
    include: {
      items: {
        where: {
          status: NotificationStatus.PENDING,
          attempts: { lt: RETRY_CONFIG.maxAttempts },
        },
      },
    },
  });

  if (!job) return true;

  const isComplete = job.items.length === 0;

  if (isComplete) {
    await prisma.bulkMessageJob.update({
      where: { id: jobId },
      data: {
        status: job.failedCount > 0 ? BulkJobStatus.COMPLETED : BulkJobStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  return isComplete;
}

// Process a chunk of messages for a job
export async function processJobChunk(
  jobId: string,
  chunkSize: number = 10
): Promise<{
  processed: number;
  success: number;
  failed: number;
  isComplete: boolean;
}> {
  // Get the job with event details
  const job = await prisma.bulkMessageJob.findUnique({
    where: { id: jobId },
    include: { weddingEvent: true },
  });

  if (!job) {
    throw new Error("Job not found");
  }

  // Check if job should be processed
  if (job.status === BulkJobStatus.CANCELLED || job.status === BulkJobStatus.COMPLETED) {
    return { processed: 0, success: 0, failed: 0, isComplete: true };
  }

  // Update job status to processing
  if (job.status === BulkJobStatus.PENDING) {
    await prisma.bulkMessageJob.update({
      where: { id: jobId },
      data: {
        status: BulkJobStatus.PROCESSING,
        startedAt: new Date(),
      },
    });
  }

  // Get template for this message type
  const templateResult = await getTemplateForSending(
    job.weddingEventId,
    job.messageType,
    job.weddingEvent.notes?.includes("locale:en") ? "en" : "he" // Default to Hebrew
  );

  const templateMessage = templateResult.success
    ? templateResult.template?.message || ""
    : "";

  // Get pending items
  const items = await prisma.bulkMessageJobItem.findMany({
    where: {
      jobId,
      status: NotificationStatus.PENDING,
      attempts: { lt: RETRY_CONFIG.maxAttempts },
    },
    take: chunkSize,
    include: { guest: true },
  });

  let processed = 0;
  let success = 0;
  let failed = 0;

  // Process items with rate limiting
  for (const item of items) {
    const result = await processItem(item, job, templateMessage);
    processed++;

    if (result.success) {
      success++;
    } else {
      failed++;
    }

    // Rate limiting delay
    await delay(1000); // 1 second between messages
  }

  // Update job progress
  await updateJobProgress(jobId);

  // Check if job is complete
  const isComplete = await checkJobCompletion(jobId);

  return { processed, success, failed, isComplete };
}

// Create a new bulk message job
export async function createBulkJob(
  eventId: string,
  userId: string,
  messageType: NotificationType,
  guestIds?: string[] // Optional: specific guests. If not provided, all guests with phone numbers
): Promise<{ jobId: string; totalGuests: number }> {
  // Get guests to include in the job
  let guestsQuery: any = {
    weddingEventId: eventId,
    phoneNumber: { not: null },
  };

  if (guestIds && guestIds.length > 0) {
    guestsQuery.id = { in: guestIds };
  }

  // For invites, exclude already invited guests
  if (messageType === NotificationType.INVITE) {
    guestsQuery.notificationLogs = {
      none: {
        type: NotificationType.INVITE,
        status: NotificationStatus.SENT,
      },
    };
  }

  // For reminders, only include pending RSVPs
  if (messageType === NotificationType.REMINDER) {
    guestsQuery.OR = [{ rsvp: null }, { rsvp: { status: "PENDING" } }];
  }

  const guests = await prisma.guest.findMany({
    where: guestsQuery,
    select: { id: true },
  });

  if (guests.length === 0) {
    throw new Error("No eligible guests found");
  }

  // Create the job
  const job = await prisma.bulkMessageJob.create({
    data: {
      weddingEventId: eventId,
      createdBy: userId,
      messageType,
      totalGuests: guests.length,
      items: {
        create: guests.map((guest) => ({
          guestId: guest.id,
        })),
      },
    },
  });

  return { jobId: job.id, totalGuests: guests.length };
}

// Cancel a bulk job
export async function cancelBulkJob(jobId: string): Promise<void> {
  await prisma.bulkMessageJob.update({
    where: { id: jobId },
    data: {
      status: BulkJobStatus.CANCELLED,
      completedAt: new Date(),
    },
  });
}

// Get job status
export async function getJobStatus(jobId: string): Promise<{
  status: BulkJobStatus;
  totalGuests: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
} | null> {
  const job = await prisma.bulkMessageJob.findUnique({
    where: { id: jobId },
    select: {
      status: true,
      totalGuests: true,
      processedCount: true,
      successCount: true,
      failedCount: true,
      startedAt: true,
      completedAt: true,
    },
  });

  return job;
}

// Get all pending jobs (for cron processing)
export async function getPendingJobs(): Promise<string[]> {
  const jobs = await prisma.bulkMessageJob.findMany({
    where: {
      status: {
        in: [BulkJobStatus.PENDING, BulkJobStatus.PROCESSING],
      },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  return jobs.map((j) => j.id);
}
