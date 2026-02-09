"use server";

import { revalidatePath } from "next/cache";
import { UserRole, NotificationType, NotificationChannel, NotificationStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canAccessEvent } from "@/lib/permissions";
import { getNotificationService } from "@/lib/notifications";
import { PLAN_LIMITS } from "@/config/plans";
import { logWhatsAppCost, logSmsCost } from "@/lib/analytics/usage-tracking";

// Constants for batch processing
const BATCH_SIZE = 10; // Process 10 messages at a time
const BATCH_DELAY_MS = 1100; // 1.1 seconds between batches (Twilio rate limit is ~1 msg/sec)
const MAX_CONCURRENT = 5; // Max concurrent requests within a batch

interface BulkMessageOptions {
  eventId: string;
  guestIds: string[];
  messageType: "INVITE" | "REMINDER" | "EVENT_DAY" | "THANK_YOU";
  messageFormat: "STANDARD" | "INTERACTIVE";
  channel: "WHATSAPP" | "SMS" | "AUTO";
  includeImage?: boolean;
  smsTemplate?: string;
  whatsappContentSid?: string;
}

interface BulkMessageResult {
  success: boolean;
  sent: number;
  failed: number;
  skippedLimit: number;
  total: number;
  errors: string[];
  error?: string;
}

// Helper to get remaining messages for a user
async function getRemainingMessages(userId: string): Promise<{
  whatsapp: number;
  sms: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { usageTracking: true },
  });

  if (!user) {
    return { whatsapp: 0, sms: 0 };
  }

  const planLimits = PLAN_LIMITS[user.plan];
  const usage = user.usageTracking;

  return {
    whatsapp: planLimits.maxWhatsappMessages === -1
      ? 999999
      : Math.max(0, planLimits.maxWhatsappMessages + (usage?.whatsappBonus || 0) - (usage?.whatsappSent || 0)),
    sms: planLimits.maxSmsMessages === -1
      ? 999999
      : Math.max(0, planLimits.maxSmsMessages + (usage?.smsBonus || 0) - (usage?.smsSent || 0)),
  };
}

// Helper to update usage tracking in batch
async function updateUsageTracking(
  userId: string,
  channel: NotificationChannel,
  count: number
): Promise<void> {
  if (count <= 0) return;

  if (channel === NotificationChannel.WHATSAPP) {
    await prisma.usageTracking.upsert({
      where: { userId },
      create: {
        userId,
        whatsappSent: count,
        periodStart: new Date(),
      },
      update: {
        whatsappSent: { increment: count },
      },
    });
  } else if (channel === NotificationChannel.SMS) {
    await prisma.usageTracking.upsert({
      where: { userId },
      create: {
        userId,
        smsSent: count,
        periodStart: new Date(),
      },
      update: {
        smsSent: { increment: count },
      },
    });
  }
}

// Sleep helper for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Process a single message
async function processSingleMessage(
  notificationService: Awaited<ReturnType<typeof getNotificationService>>,
  guest: {
    id: string;
    name: string;
    phoneNumber: string | null;
    slug: string;
    weddingEvent: {
      id: string;
      title: string;
      dateTime: Date;
      location: string;
      venue: string | null;
      ownerId: string;
      invitationImageUrl: string | null;
      smsSenderId: string | null;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
    tableAssignment?: {
      table: { name: string } | null;
    } | null;
  },
  options: {
    messageType: "INVITE" | "REMINDER" | "EVENT_DAY" | "THANK_YOU";
    messageFormat: "STANDARD" | "INTERACTIVE";
    channel: NotificationChannel;
    includeImage: boolean;
    smsTemplate?: string;
    whatsappContentSid?: string;
  }
): Promise<{
  success: boolean;
  guestId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  providerResponse?: string;
  error?: string;
}> {
  try {
    let result;

    if (options.messageType === "EVENT_DAY") {
      // Event day reminder - build custom message with venue and table info
      const event = guest.weddingEvent;
      const tableName = guest.tableAssignment?.table?.name || "";
      const venue = event.venue ? `${event.venue}, ${event.location}` : event.location;
      const isHebrew = !event.notes?.includes("locale:en");

      let message: string;
      if (options.smsTemplate) {
        message = options.smsTemplate
          .replace(/\{\{guestName\}\}/g, guest.name)
          .replace(/\{\{eventTitle\}\}/g, event.title)
          .replace(/\{\{eventVenue\}\}/g, venue);
      } else {
        message = isHebrew
          ? `שלום ${guest.name}!\n${event.title} מתקיים היום!\nמקום: ${venue}${tableName ? `\nשולחן: ${tableName}` : ""}\nנתראה בשמחה!`
          : `Dear ${guest.name},\n${event.title} is today!\nVenue: ${venue}${tableName ? `\nTable: ${tableName}` : ""}\nSee you at the celebration!`;
      }

      // For WhatsApp with template SID, use the content template
      if (options.channel === NotificationChannel.WHATSAPP && options.whatsappContentSid) {
        result = await notificationService.sendReminder(
          guest as any,
          event as any,
          options.channel,
          message,
          { whatsappContentSid: options.whatsappContentSid }
        );
      } else {
        result = await notificationService.sendReminder(
          guest as any,
          event as any,
          options.channel,
          message
        );
      }
    } else if (options.messageFormat === "INTERACTIVE") {
      // Interactive button messages (WhatsApp only)
      if (options.messageType === "INVITE") {
        result = await notificationService.sendInteractiveInvite(
          guest as any,
          guest.weddingEvent as any,
          options.includeImage,
          options.whatsappContentSid
        );
      } else {
        result = await notificationService.sendInteractiveReminder(
          guest as any,
          guest.weddingEvent as any,
          options.includeImage,
          options.whatsappContentSid
        );
      }
    } else {
      // Standard messages with RSVP link (pass custom template for SMS/WhatsApp if provided)
      if (options.messageType === "INVITE") {
        result = await notificationService.sendInvite(
          guest as any,
          guest.weddingEvent as any,
          options.channel,
          options.smsTemplate,
          { whatsappContentSid: options.whatsappContentSid }
        );
      } else {
        result = await notificationService.sendReminder(
          guest as any,
          guest.weddingEvent as any,
          options.channel,
          options.smsTemplate,
          { whatsappContentSid: options.whatsappContentSid }
        );
      }
    }

    return {
      success: result.success,
      guestId: guest.id,
      channel: result.channel,
      status: result.status,
      providerResponse: result.providerResponse,
      error: result.error,
    };
  } catch (error) {
    console.error(`Error sending message to guest ${guest.id}:`, error);
    return {
      success: false,
      guestId: guest.id,
      channel: options.channel,
      status: NotificationStatus.FAILED,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Process a batch of messages with controlled concurrency
async function processBatch(
  notificationService: Awaited<ReturnType<typeof getNotificationService>>,
  guests: Array<{
    id: string;
    name: string;
    phoneNumber: string | null;
    slug: string;
    weddingEvent: {
      id: string;
      title: string;
      dateTime: Date;
      location: string;
      venue: string | null;
      ownerId: string;
      invitationImageUrl: string | null;
      smsSenderId: string | null;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
    tableAssignment?: {
      table: { name: string } | null;
    } | null;
  }>,
  options: {
    messageType: "INVITE" | "REMINDER" | "EVENT_DAY" | "THANK_YOU";
    messageFormat: "STANDARD" | "INTERACTIVE";
    channel: NotificationChannel;
    includeImage: boolean;
    smsTemplate?: string;
    whatsappContentSid?: string;
  }
): Promise<Array<{
  success: boolean;
  guestId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  providerResponse?: string;
  error?: string;
}>> {
  // Process guests in smaller concurrent chunks
  const results: Array<{
    success: boolean;
    guestId: string;
    channel: NotificationChannel;
    status: NotificationStatus;
    providerResponse?: string;
    error?: string;
  }> = [];

  for (let i = 0; i < guests.length; i += MAX_CONCURRENT) {
    const chunk = guests.slice(i, i + MAX_CONCURRENT);
    const chunkResults = await Promise.allSettled(
      chunk.map(guest => processSingleMessage(notificationService, guest, options))
    );

    for (const result of chunkResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        // Handle rejected promises
        results.push({
          success: false,
          guestId: chunk[chunkResults.indexOf(result)]?.id || "unknown",
          channel: options.channel,
          status: NotificationStatus.FAILED,
          error: result.reason?.message || "Unknown error",
        });
      }
    }

    // Small delay between chunks within a batch
    if (i + MAX_CONCURRENT < guests.length) {
      await sleep(200);
    }
  }

  return results;
}

/**
 * Send bulk messages with optimized batching and rate limiting.
 * Handles 20-800+ messages efficiently.
 */
export async function sendBulkMessages(options: BulkMessageOptions): Promise<BulkMessageResult> {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !user.id || !hasWeddingOwnerRole) {
      return {
        success: false,
        sent: 0,
        failed: 0,
        skippedLimit: 0,
        total: 0,
        errors: [],
        error: "Unauthorized",
      };
    }

    // Verify event access (owner or EDITOR collaborator)
    const hasAccess = await canAccessEvent(options.eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return {
        success: false,
        sent: 0,
        failed: 0,
        skippedLimit: 0,
        total: 0,
        errors: [],
        error: "Event not found",
      };
    }

    const event = await prisma.weddingEvent.findUnique({
      where: { id: options.eventId },
    });

    // Get all requested guests with event data and table assignment (for EVENT_DAY)
    const guests = await prisma.guest.findMany({
      where: {
        id: { in: options.guestIds },
        weddingEventId: options.eventId,
      },
      include: {
        weddingEvent: true,
        tableAssignment: {
          include: { table: true },
        },
      },
    });

    if (guests.length === 0) {
      return {
        success: true,
        sent: 0,
        failed: 0,
        skippedLimit: 0,
        total: 0,
        errors: [],
      };
    }

    // Check remaining quota
    const remaining = await getRemainingMessages(user.id);

    // Determine effective channel (Interactive always uses WhatsApp, AUTO prefers WhatsApp)
    let effectiveChannel: NotificationChannel;
    if (options.messageFormat === "INTERACTIVE" || options.channel === "WHATSAPP") {
      effectiveChannel = NotificationChannel.WHATSAPP;
    } else if (options.channel === "SMS") {
      effectiveChannel = NotificationChannel.SMS;
    } else {
      // AUTO: prefer WhatsApp if quota available, otherwise SMS
      effectiveChannel = remaining.whatsapp > 0 ? NotificationChannel.WHATSAPP : NotificationChannel.SMS;
    }
    const availableQuota = effectiveChannel === NotificationChannel.WHATSAPP
      ? remaining.whatsapp
      : remaining.sms;

    if (availableQuota <= 0) {
      return {
        success: false,
        sent: 0,
        failed: 0,
        skippedLimit: guests.length,
        total: guests.length,
        errors: [`${effectiveChannel} message limit reached`],
        error: `${effectiveChannel} message limit reached`,
      };
    }

    // Limit guests to available quota
    const guestsToProcess = guests.slice(0, availableQuota);
    const skippedDueToLimit = guests.length - guestsToProcess.length;

    // Get notification service once for all messages
    const notificationService = await getNotificationService();

    // Determine notification type
    let notificationType: NotificationType;
    if (options.messageType === "EVENT_DAY") {
      notificationType = NotificationType.EVENT_DAY;
    } else if (options.messageFormat === "INTERACTIVE") {
      notificationType = options.messageType === "INVITE" ? NotificationType.INTERACTIVE_INVITE : NotificationType.INTERACTIVE_REMINDER;
    } else {
      notificationType = options.messageType === "INVITE" ? NotificationType.INVITE : NotificationType.REMINDER;
    }

    // Process in batches
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    const notificationLogs: Array<{
      guestId: string;
      type: NotificationType;
      channel: NotificationChannel;
      status: NotificationStatus;
      providerResponse: string | null;
      sentAt: Date | null;
    }> = [];

    console.log(`Starting bulk send: ${guestsToProcess.length} guests in batches of ${BATCH_SIZE}`);

    for (let batchIndex = 0; batchIndex < guestsToProcess.length; batchIndex += BATCH_SIZE) {
      const batch = guestsToProcess.slice(batchIndex, batchIndex + BATCH_SIZE);
      const batchNumber = Math.floor(batchIndex / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(guestsToProcess.length / BATCH_SIZE);

      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} guests)`);

      // Process the batch
      const batchResults = await processBatch(notificationService, batch, {
        messageType: options.messageType,
        messageFormat: options.messageFormat,
        channel: effectiveChannel,
        includeImage: options.includeImage || false,
        smsTemplate: options.smsTemplate,
        whatsappContentSid: options.whatsappContentSid,
      });

      // Collect results
      for (const result of batchResults) {
        notificationLogs.push({
          guestId: result.guestId,
          type: notificationType,
          channel: result.channel,
          status: result.status,
          providerResponse: result.providerResponse || null,
          sentAt: result.success ? new Date() : null,
        });

        if (result.success) {
          sent++;

          // Log cost for this message
          try {
            if (result.channel === NotificationChannel.WHATSAPP) {
              await logWhatsAppCost(user.id, options.eventId, result.guestId, {
                notificationType,
                source: "bulk",
              });
            } else if (result.channel === NotificationChannel.SMS) {
              const settings = await prisma.messagingProviderSettings.findFirst();
              const smsProvider = (settings?.smsProvider as "twilio" | "upsend") || "twilio";
              await logSmsCost(user.id, options.eventId, result.guestId, smsProvider, {
                notificationType,
                source: "bulk",
              });
            }
          } catch (costError) {
            console.error("Error logging cost:", costError);
            // Don't fail the bulk send if cost logging fails
          }
        } else {
          failed++;
          if (result.error && !errors.includes(result.error)) {
            errors.push(result.error);
          }
        }
      }

      // Rate limit: wait before processing next batch
      if (batchIndex + BATCH_SIZE < guestsToProcess.length) {
        console.log(`Waiting ${BATCH_DELAY_MS}ms before next batch...`);
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Batch insert notification logs
    if (notificationLogs.length > 0) {
      console.log(`Inserting ${notificationLogs.length} notification logs...`);
      await prisma.notificationLog.createMany({
        data: notificationLogs,
      });
    }

    // Update usage tracking in one operation
    if (sent > 0) {
      await updateUsageTracking(user.id, effectiveChannel, sent);
    }

    // Revalidate the event page
    revalidatePath(`/dashboard/events/${options.eventId}`);

    console.log(`Bulk send complete: ${sent} sent, ${failed} failed, ${skippedDueToLimit} skipped`);

    return {
      success: true,
      sent,
      failed,
      skippedLimit: skippedDueToLimit,
      total: guests.length,
      errors: errors.slice(0, 5), // Limit error messages
    };
  } catch (error) {
    console.error("Error in bulk send:", error);
    return {
      success: false,
      sent: 0,
      failed: 0,
      skippedLimit: 0,
      total: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
      error: "Failed to send messages",
    };
  }
}

/**
 * Get progress status for bulk operations (for future streaming support)
 */
export async function getBulkSendProgress(operationId: string): Promise<{
  progress: number;
  sent: number;
  failed: number;
  total: number;
  status: "pending" | "processing" | "completed" | "failed";
}> {
  // This is a placeholder for future streaming/progress tracking
  // In a real implementation, this would read from a cache like Redis
  return {
    progress: 0,
    sent: 0,
    failed: 0,
    total: 0,
    status: "pending",
  };
}
