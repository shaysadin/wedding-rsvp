"use server";

import { revalidatePath } from "next/cache";
import { UserRole, NotificationType, NotificationChannel, NotificationStatus, PlanTier } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getNotificationService } from "@/lib/notifications";
import { PLAN_LIMITS, BUSINESS_VOICE_ADDON_CALLS, getVoiceCallLimit } from "@/config/plans";
import { onNotificationSent } from "@/lib/automation/event-handlers";
import { logWhatsAppCost, logSmsCost } from "@/lib/analytics/usage-tracking";

export type ChannelType = "WHATSAPP" | "SMS" | "AUTO";

// Helper to log message cost
async function logMessageCost(
  userId: string,
  weddingEventId: string,
  guestId: string,
  channel: NotificationChannel,
  type: NotificationType
): Promise<void> {
  try {
    if (channel === NotificationChannel.WHATSAPP) {
      await logWhatsAppCost(userId, weddingEventId, guestId, {
        notificationType: type,
      });
    } else if (channel === NotificationChannel.SMS) {
      // Get SMS provider setting to log correct cost
      const settings = await prisma.messagingProviderSettings.findFirst();
      const smsProvider = (settings?.smsProvider as "twilio" | "upsend") || "twilio";

      await logSmsCost(userId, weddingEventId, guestId, smsProvider, {
        notificationType: type,
      });
    }
  } catch (error) {
    // Log error but don't fail the operation
    console.error("Error logging message cost:", error);
  }
}

// Helper to check and update usage atomically
// Uses transaction to prevent race conditions (TOCTOU vulnerability)
async function checkAndUpdateUsage(
  userId: string,
  channel: NotificationChannel,
  count: number = 1
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  try {
    // Execute check and update atomically in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get user with usage tracking (locked for update within transaction)
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { usageTracking: true },
      });

      if (!user) {
        return { allowed: false, remaining: 0, error: "User not found" };
      }

      const planLimits = PLAN_LIMITS[user.plan];
      const usage = user.usageTracking || {
        whatsappSent: 0,
        smsSent: 0,
        whatsappBonus: 0,
        smsBonus: 0,
      };

      // Calculate limits based on channel
      const totalAllowed =
        channel === NotificationChannel.WHATSAPP
          ? planLimits.maxWhatsappMessages + (usage.whatsappBonus || 0)
          : planLimits.maxSmsMessages + (usage.smsBonus || 0);

      const currentUsed =
        channel === NotificationChannel.WHATSAPP
          ? usage.whatsappSent
          : usage.smsSent;

      const remaining = totalAllowed - currentUsed;

      // Check if allowed BEFORE incrementing
      if (remaining < count) {
        const channelName = channel === NotificationChannel.WHATSAPP ? "WhatsApp" : "SMS";
        return {
          allowed: false,
          remaining,
          error: `${channelName} message limit reached. ${remaining} messages remaining.`,
        };
      }

      // Atomic increment - only executes if check passes
      await tx.usageTracking.upsert({
        where: { userId },
        create: {
          userId,
          whatsappSent: channel === NotificationChannel.WHATSAPP ? count : 0,
          smsSent: channel === NotificationChannel.SMS ? count : 0,
          periodStart: new Date(),
        },
        update: {
          ...(channel === NotificationChannel.WHATSAPP && {
            whatsappSent: { increment: count },
          }),
          ...(channel === NotificationChannel.SMS && {
            smsSent: { increment: count },
          }),
        },
      });

      return { allowed: true, remaining: remaining - count };
    });

    return result;
  } catch (error) {
    console.error("Error in checkAndUpdateUsage:", error);
    return {
      allowed: false,
      remaining: 0,
      error: "Failed to check usage limits",
    };
  }
}

// Helper to get remaining messages for a user (internal use)
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
    whatsapp: Math.max(
      0,
      planLimits.maxWhatsappMessages + (usage?.whatsappBonus || 0) - (usage?.whatsappSent || 0)
    ),
    sms: Math.max(
      0,
      planLimits.maxSmsMessages + (usage?.smsBonus || 0) - (usage?.smsSent || 0)
    ),
  };
}

// Helper: Get billing period start date
function getBillingPeriodStart(stripeCurrentPeriodEnd: Date | null, usagePeriodStart: Date | null): Date {
  // If user has Stripe subscription, calculate period start from period end
  if (stripeCurrentPeriodEnd) {
    const periodEnd = new Date(stripeCurrentPeriodEnd);
    const periodStart = new Date(periodEnd);
    periodStart.setMonth(periodStart.getMonth() - 1); // Monthly billing
    return periodStart;
  }

  // Use usageTracking periodStart if available
  if (usagePeriodStart) {
    return new Date(usagePeriodStart);
  }

  // Default to 30 days ago for free users
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return thirtyDaysAgo;
}

// Public function to get current user's message usage and limits
export async function getCurrentUserUsage() {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        plan: true,
        voiceCallsAddOn: true,
        stripeCurrentPeriodEnd: true,
        usageTracking: true,
        weddingEvents: {
          select: { id: true },
        },
      },
    });

    if (!dbUser) {
      return { error: "User not found" };
    }

    const planLimits = PLAN_LIMITS[dbUser.plan];
    const usage = dbUser.usageTracking;

    // Get billing period start for filtering
    const periodStart = getBillingPeriodStart(
      dbUser.stripeCurrentPeriodEnd,
      usage?.periodStart || null
    );

    // Get actual message counts from NotificationLog for accuracy
    const eventIds = dbUser.weddingEvents.map(e => e.id);

    // Count actual sent messages from NotificationLog and VapiCallLog within current billing period
    const [whatsappCount, smsCount, callsCount] = await Promise.all([
      prisma.notificationLog.count({
        where: {
          guest: {
            weddingEventId: { in: eventIds },
          },
          channel: NotificationChannel.WHATSAPP,
          status: { in: ["SENT", "DELIVERED"] },
          createdAt: { gte: periodStart },
        },
      }),
      prisma.notificationLog.count({
        where: {
          guest: {
            weddingEventId: { in: eventIds },
          },
          channel: NotificationChannel.SMS,
          status: { in: ["SENT", "DELIVERED"] },
          createdAt: { gte: periodStart },
        },
      }),
      prisma.vapiCallLog.count({
        where: {
          weddingEventId: { in: eventIds },
          status: { in: ["COMPLETED", "NO_ANSWER", "BUSY", "CALLING"] },
          createdAt: { gte: periodStart },
        },
      }),
    ]);

    // Use actual counts from NotificationLog and VapiCallLog
    const whatsappSent = whatsappCount;
    const smsSent = smsCount;
    const whatsappBonus = usage?.whatsappBonus || 0;
    const smsBonus = usage?.smsBonus || 0;
    const voiceCallsMade = callsCount;
    const voiceCallsBonus = usage?.voiceCallsBonus || 0;

    // Handle unlimited (-1) cases
    const whatsappTotal = planLimits.maxWhatsappMessages === -1 ? -1 : planLimits.maxWhatsappMessages + whatsappBonus;
    const smsTotal = planLimits.maxSmsMessages === -1 ? -1 : planLimits.maxSmsMessages + smsBonus;

    // For BUSINESS plan, voice calls depend on the voiceCallsAddOn status
    const effectiveVoiceCallLimit = getVoiceCallLimit(dbUser.plan, dbUser.voiceCallsAddOn ?? false);
    const voiceCallsTotal = effectiveVoiceCallLimit === -1 ? -1 : effectiveVoiceCallLimit + voiceCallsBonus;

    return {
      success: true,
      plan: dbUser.plan,
      usage: {
        whatsapp: {
          sent: whatsappSent,
          limit: planLimits.maxWhatsappMessages,
          bonus: whatsappBonus,
          total: whatsappTotal === -1 ? 999999 : whatsappTotal,
          remaining: whatsappTotal === -1 ? 999999 : Math.max(0, whatsappTotal - whatsappSent),
        },
        sms: {
          sent: smsSent,
          limit: planLimits.maxSmsMessages,
          bonus: smsBonus,
          total: smsTotal === -1 ? 999999 : smsTotal,
          remaining: smsTotal === -1 ? 999999 : Math.max(0, smsTotal - smsSent),
        },
        calls: {
          made: voiceCallsMade,
          limit: effectiveVoiceCallLimit,
          bonus: voiceCallsBonus,
          total: voiceCallsTotal === -1 ? 999999 : voiceCallsTotal,
          remaining: voiceCallsTotal === -1 ? 999999 : Math.max(0, voiceCallsTotal - voiceCallsMade),
        },
      },
      canSendMessages: (whatsappTotal === -1 || whatsappTotal > 0) || (smsTotal === -1 || smsTotal > 0),
    };
  } catch (error) {
    console.error("Error fetching user usage:", error);
    return { error: "Failed to fetch usage" };
  }
}

export async function sendInvite(guestId: string, channel: ChannelType = "AUTO", customTemplate?: string, whatsappContentSid?: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Get guest with event
    const guest = await prisma.guest.findFirst({
      where: { id: guestId },
      include: { weddingEvent: true },
    });

    if (!guest || guest.weddingEvent.ownerId !== user.id) {
      return { error: "Guest not found" };
    }

    // Determine channel to use
    const notificationService = await getNotificationService();
    const preferredChannel = channel === "AUTO" ? undefined : (channel as NotificationChannel);

    // Check usage before sending (estimate channel if AUTO)
    const effectiveChannel = preferredChannel || (guest.phoneNumber?.startsWith("+") ? NotificationChannel.WHATSAPP : NotificationChannel.SMS);
    const remaining = await getRemainingMessages(user.id);

    if (effectiveChannel === NotificationChannel.WHATSAPP && remaining.whatsapp <= 0) {
      return { error: "WhatsApp message limit reached", limitReached: true };
    }
    if (effectiveChannel === NotificationChannel.SMS && remaining.sms <= 0) {
      return { error: "SMS message limit reached", limitReached: true };
    }

    // Send notification (pass custom template for SMS and/or WhatsApp Content SID if provided)
    const result = await notificationService.sendInvite(guest, guest.weddingEvent, preferredChannel, customTemplate, { whatsappContentSid });

    // Log to database
    await prisma.notificationLog.create({
      data: {
        guestId: guest.id,
        type: NotificationType.INVITE,
        channel: result.channel,
        status: result.status,
        providerResponse: result.providerResponse,
        sentAt: result.success ? new Date() : null,
      },
    });

    // Update usage tracking if message was sent
    if (result.success) {
      await checkAndUpdateUsage(user.id, result.channel, 1);

      // Log cost for this message
      await logMessageCost(user.id, guest.weddingEventId, guest.id, result.channel, NotificationType.INVITE);

      // Trigger automation scheduling for NO_RESPONSE flows
      await onNotificationSent({
        guestId: guest.id,
        weddingEventId: guest.weddingEventId,
        notificationType: "INVITE",
        sentAt: new Date(),
      });
    }

    revalidatePath(`/dashboard/events/${guest.weddingEventId}`);

    if (!result.success && result.error) {
      return { error: result.error, channel: result.channel };
    }

    return { success: result.success, channel: result.channel };
  } catch (error) {
    console.error("Error sending invite:", error);
    return { error: "Failed to send invite" };
  }
}

export async function sendReminder(guestId: string, channel: ChannelType = "AUTO", customTemplate?: string, whatsappContentSid?: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Get guest with event
    const guest = await prisma.guest.findFirst({
      where: { id: guestId },
      include: { weddingEvent: true, rsvp: true },
    });

    if (!guest || guest.weddingEvent.ownerId !== user.id) {
      return { error: "Guest not found" };
    }

    // Only block reminder if guest has confirmed (ACCEPTED) or declined
    // Allow reminders for PENDING and MAYBE statuses
    if (guest.rsvp && (guest.rsvp.status === "ACCEPTED" || guest.rsvp.status === "DECLINED")) {
      return { error: "Guest has already confirmed their response" };
    }

    // Determine channel to use
    const notificationService = await getNotificationService();
    const preferredChannel = channel === "AUTO" ? undefined : (channel as NotificationChannel);

    // Check usage before sending
    const effectiveChannel = preferredChannel || (guest.phoneNumber?.startsWith("+") ? NotificationChannel.WHATSAPP : NotificationChannel.SMS);
    const remaining = await getRemainingMessages(user.id);

    if (effectiveChannel === NotificationChannel.WHATSAPP && remaining.whatsapp <= 0) {
      return { error: "WhatsApp message limit reached", limitReached: true };
    }
    if (effectiveChannel === NotificationChannel.SMS && remaining.sms <= 0) {
      return { error: "SMS message limit reached", limitReached: true };
    }

    // Send notification (pass custom template for SMS and/or WhatsApp Content SID if provided)
    const result = await notificationService.sendReminder(guest, guest.weddingEvent, preferredChannel, customTemplate, { whatsappContentSid });

    // Log to database
    await prisma.notificationLog.create({
      data: {
        guestId: guest.id,
        type: NotificationType.REMINDER,
        channel: result.channel,
        status: result.status,
        providerResponse: result.providerResponse,
        sentAt: result.success ? new Date() : null,
      },
    });

    // Update usage tracking if message was sent
    if (result.success) {
      await checkAndUpdateUsage(user.id, result.channel, 1);

      // Log cost for this message
      await logMessageCost(user.id, guest.weddingEventId, guest.id, result.channel, NotificationType.REMINDER);

      // Trigger automation scheduling for NO_RESPONSE flows
      await onNotificationSent({
        guestId: guest.id,
        weddingEventId: guest.weddingEventId,
        notificationType: "REMINDER",
        sentAt: new Date(),
      });
    }

    revalidatePath(`/dashboard/events/${guest.weddingEventId}`);

    if (!result.success && result.error) {
      return { error: result.error, channel: result.channel };
    }

    return { success: result.success, channel: result.channel };
  } catch (error) {
    console.error("Error sending reminder:", error);
    return { error: "Failed to send reminder" };
  }
}

export async function sendEventDayReminder(guestId: string, channel: ChannelType = "AUTO", customTemplate?: string, whatsappContentSid?: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Get guest with event, table assignment, and RSVP settings
    const guest = await prisma.guest.findFirst({
      where: { id: guestId },
      include: {
        weddingEvent: {
          include: {
            rsvpPageSettings: true,
          },
        },
        rsvp: true,
        tableAssignment: {
          include: { table: true },
        },
      },
    });

    if (!guest || guest.weddingEvent.ownerId !== user.id) {
      return { error: "Guest not found" };
    }

    // Determine channel to use
    const notificationService = await getNotificationService();
    const preferredChannel = channel === "AUTO" ? undefined : (channel as NotificationChannel);

    // Check usage before sending
    const effectiveChannel = preferredChannel || (guest.phoneNumber?.startsWith("+") ? NotificationChannel.WHATSAPP : NotificationChannel.SMS);
    const remaining = await getRemainingMessages(user.id);

    if (effectiveChannel === NotificationChannel.WHATSAPP && remaining.whatsapp <= 0) {
      return { error: "WhatsApp message limit reached", limitReached: true };
    }
    if (effectiveChannel === NotificationChannel.SMS && remaining.sms <= 0) {
      return { error: "SMS message limit reached", limitReached: true };
    }

    const event = guest.weddingEvent;

    // Get table name with fallback
    const isHebrew = !event.notes?.includes("locale:en");
    const tableName = guest.tableAssignment?.table?.name || (isHebrew ? "טרם שובץ" : "Not yet assigned");

    // Build venue/address display - combine venue + location with comma
    // Example: "מאגיה, רחוב החשמל 5, טבריה"
    let venueAddressDisplay = "";
    if (event.venue && event.location) {
      venueAddressDisplay = `${event.venue}, ${event.location}`;
    } else {
      venueAddressDisplay = event.venue || event.location || (isHebrew ? "המקום" : "The venue");
    }

    const venue = venueAddressDisplay;

    // Build navigation URL - always use Waze with address
    let navigationUrl = "";
    const addressForNav = event.location || event.venue;
    if (addressForNav) {
      const encodedAddress = encodeURIComponent(addressForNav);
      navigationUrl = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
    }

    // Build gift link - check for external provider first
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rsvp.app";
    let giftLink = "";

    const giftSettings = await prisma.giftPaymentSettings.findUnique({
      where: { weddingEventId: event.id },
    });

    if (giftSettings?.isEnabled) {
      if (giftSettings.useExternalProvider && giftSettings.externalProviderUrl) {
        giftLink = giftSettings.externalProviderUrl;
      } else if (guest.slug) {
        giftLink = `${baseUrl}/gift/${guest.slug}`;
      }
    }

    let message: string;
    if (customTemplate) {
      // Render custom SMS template
      message = customTemplate
        .replace(/\{\{guestName\}\}/g, guest.name)
        .replace(/\{\{eventTitle\}\}/g, event.title)
        .replace(/\{\{eventVenue\}\}/g, venue)
        .replace(/\{\{tableName\}\}/g, tableName)
        .replace(/\{\{navigationUrl\}\}/g, navigationUrl)
        .replace(/\{\{giftLink\}\}/g, giftLink);
    } else {
      // Default message
      message = isHebrew
        ? `שלום ${guest.name}!\n${event.title} מתקיים היום!\nמקום: ${venue}\nשולחן: ${tableName}\nנתראה בשמחה!`
        : `Dear ${guest.name},\n${event.title} is today!\nVenue: ${venue}\nTable: ${tableName}\nSee you at the celebration!`;
    }

    // Prepare WhatsApp options if using WhatsApp
    let whatsappOptions: { contentSid?: string; contentVariables?: Record<string, string> } | undefined;
    if (whatsappContentSid && effectiveChannel === NotificationChannel.WHATSAPP) {
      whatsappOptions = {
        contentSid: whatsappContentSid,
        contentVariables: {
          "1": guest.name,
          "2": event.title,
          "3": tableName,
          "4": venueAddressDisplay,
          "5": navigationUrl || "",
          "6": giftLink || "",
        },
      };
    }

    // Send using the base sendMessage method via sendReminder (pass the constructed message and whatsapp variables)
    const result = await notificationService.sendReminder(
      guest,
      event,
      preferredChannel,
      message,
      whatsappOptions ? {
        whatsappContentSid,
        contentVariables: whatsappOptions.contentVariables
      } : undefined
    );

    // Log to database
    await prisma.notificationLog.create({
      data: {
        guestId: guest.id,
        type: NotificationType.EVENT_DAY,
        channel: result.channel,
        status: result.status,
        providerResponse: result.providerResponse,
        sentAt: result.success ? new Date() : null,
      },
    });

    // Update usage tracking if message was sent
    if (result.success) {
      await checkAndUpdateUsage(user.id, result.channel, 1);
      await logMessageCost(user.id, guest.weddingEventId, guest.id, result.channel, NotificationType.EVENT_DAY);
    }

    revalidatePath(`/dashboard/events/${guest.weddingEventId}`);

    if (!result.success && result.error) {
      return { error: result.error, channel: result.channel };
    }

    return { success: result.success, channel: result.channel };
  } catch (error) {
    console.error("Error sending event day reminder:", error);
    return { error: "Failed to send event day reminder" };
  }
}

export async function sendBulkReminders(eventId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !user.id || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Get all pending guests
    const pendingGuests = await prisma.guest.findMany({
      where: {
        weddingEventId: eventId,
        OR: [
          { rsvp: null },
          { rsvp: { status: "PENDING" } },
        ],
      },
      include: { weddingEvent: true },
    });

    if (pendingGuests.length === 0) {
      return { success: true, sent: 0, message: "No pending guests to remind" };
    }

    // Check remaining messages
    const remaining = await getRemainingMessages(user.id);
    if (remaining.whatsapp <= 0 && remaining.sms <= 0) {
      return { error: "Message limit reached", limitReached: true };
    }

    // Get notification service once for all guests
    const notificationService = await getNotificationService();

    // Send reminders to all pending guests
    let sent = 0;
    let failed = 0;
    let skippedLimit = 0;

    // Track remaining messages locally to avoid N+1 queries
    let currentRemaining = { ...remaining };

    for (const guest of pendingGuests) {
      // Check remaining using local tracking (avoids DB query per guest)
      if (currentRemaining.whatsapp <= 0 && currentRemaining.sms <= 0) {
        skippedLimit++;
        continue;
      }

      try {
        const result = await notificationService.sendReminder(guest, guest.weddingEvent);

        await prisma.notificationLog.create({
          data: {
            guestId: guest.id,
            type: NotificationType.REMINDER,
            channel: result.channel,
            status: result.status,
            providerResponse: result.providerResponse,
            sentAt: result.success ? new Date() : null,
          },
        });

        if (result.success) {
          await checkAndUpdateUsage(user.id, result.channel, 1);

          // Log cost for this message
          await logMessageCost(user.id, guest.weddingEventId, guest.id, result.channel, NotificationType.REMINDER);

          // Update local tracking
          if (result.channel === NotificationChannel.WHATSAPP) {
            currentRemaining.whatsapp--;
          } else if (result.channel === NotificationChannel.SMS) {
            currentRemaining.sms--;
          }
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error sending reminder to guest ${guest.id}:`, error);
        // Log the unexpected error
        await prisma.notificationLog.create({
          data: {
            guestId: guest.id,
            type: NotificationType.REMINDER,
            channel: NotificationChannel.WHATSAPP,
            status: NotificationStatus.FAILED,
            providerResponse: JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown error"
            }),
            sentAt: null,
          },
        });
        failed++;
      }
    }

    revalidatePath(`/dashboard/events/${eventId}`);

    return {
      success: true,
      sent,
      failed,
      skippedLimit,
      total: pendingGuests.length,
    };
  } catch (error) {
    console.error("Error sending bulk reminders:", error);
    return { error: "Failed to send reminders" };
  }
}

export async function sendBulkInvites(eventId: string) {
  console.log(`[sendBulkInvites] Starting for event ${eventId}`);
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !user.id || !hasWeddingOwnerRole) {
      console.log(`[sendBulkInvites] Unauthorized`);
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      console.log(`[sendBulkInvites] Event not found`);
      return { error: "Event not found" };
    }

    // Get all guests who haven't received an invite yet (including interactive invites)
    const uninvitedGuests = await prisma.guest.findMany({
      where: {
        weddingEventId: eventId,
        AND: [
          {
            notificationLogs: {
              none: {
                type: NotificationType.INVITE,
                status: "SENT",
              },
            },
          },
          {
            notificationLogs: {
              none: {
                type: NotificationType.INTERACTIVE_INVITE,
                status: "SENT",
              },
            },
          },
        ],
      },
      include: { weddingEvent: true },
    });

    console.log(`[sendBulkInvites] Found ${uninvitedGuests.length} uninvited guests`);

    if (uninvitedGuests.length === 0) {
      return { success: true, sent: 0, message: "All guests have been invited" };
    }

    // Check remaining messages
    const remaining = await getRemainingMessages(user.id);
    console.log(`[sendBulkInvites] Remaining messages - WhatsApp: ${remaining.whatsapp}, SMS: ${remaining.sms}`);

    if (remaining.whatsapp <= 0 && remaining.sms <= 0) {
      console.log(`[sendBulkInvites] Message limit reached`);
      return { error: "Message limit reached", limitReached: true };
    }

    // Get notification service once for all guests
    const notificationService = await getNotificationService();

    // Send invites to all uninvited guests
    let sent = 0;
    let failed = 0;
    let skippedLimit = 0;

    // Track remaining messages locally to avoid N+1 queries
    let currentRemaining = { ...remaining };

    console.log(`[sendBulkInvites] Starting to send messages...`);

    for (const guest of uninvitedGuests) {
      // Check remaining using local tracking (avoids DB query per guest)
      if (currentRemaining.whatsapp <= 0 && currentRemaining.sms <= 0) {
        skippedLimit++;
        continue;
      }

      try {
        console.log(`[sendBulkInvites] Sending to guest ${guest.id} (${guest.name})`);
        const result = await notificationService.sendInvite(guest, guest.weddingEvent);
        console.log(`[sendBulkInvites] Result for ${guest.id}: ${result.success ? 'SUCCESS' : 'FAILED'}`);

        // Always create notification log, wrapped in try-catch to ensure it doesn't break the flow
        try {
          await prisma.notificationLog.create({
            data: {
              guestId: guest.id,
              type: NotificationType.INVITE,
              channel: result.channel,
              status: result.status,
              providerResponse: result.providerResponse,
              sentAt: result.success ? new Date() : null,
            },
          });
          console.log(`[sendBulkInvites] Log created for guest ${guest.id}`);
        } catch (logError) {
          console.error(`[sendBulkInvites] CRITICAL: Failed to create notification log for guest ${guest.id}:`, logError);
        }

        if (result.success) {
          await checkAndUpdateUsage(user.id, result.channel, 1);

          // Log cost for this message
          try {
            await logMessageCost(user.id, guest.weddingEventId, guest.id, result.channel, NotificationType.INVITE);
          } catch (costError) {
            console.error(`[sendBulkInvites] Failed to log cost for guest ${guest.id}:`, costError);
          }

          // Update local tracking
          if (result.channel === NotificationChannel.WHATSAPP) {
            currentRemaining.whatsapp--;
          } else if (result.channel === NotificationChannel.SMS) {
            currentRemaining.sms--;
          }
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`[sendBulkInvites] Error sending invite to guest ${guest.id}:`, error);
        // Log the unexpected error - wrap in try-catch
        try {
          await prisma.notificationLog.create({
            data: {
              guestId: guest.id,
              type: NotificationType.INVITE,
              channel: NotificationChannel.WHATSAPP,
              status: NotificationStatus.FAILED,
              providerResponse: JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error"
              }),
              sentAt: null,
            },
          });
          console.log(`[sendBulkInvites] Error log created for guest ${guest.id}`);
        } catch (logError) {
          console.error(`[sendBulkInvites] CRITICAL: Failed to create error log for guest ${guest.id}:`, logError);
        }
        failed++;
      }
    }

    revalidatePath(`/dashboard/events/${eventId}`);

    console.log(`[sendBulkInvites] Complete - Sent: ${sent}, Failed: ${failed}, Skipped: ${skippedLimit}`);

    return {
      success: true,
      sent,
      failed,
      skippedLimit,
      total: uninvitedGuests.length,
    };
  } catch (error) {
    console.error("[sendBulkInvites] CRITICAL ERROR:", error);
    return { error: "Failed to send invites" };
  }
}

// Send interactive invite with buttons (WhatsApp only)
export async function sendInteractiveInvite(guestId: string, includeImage: boolean = false, whatsappContentSid?: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Get guest with event
    const guest = await prisma.guest.findFirst({
      where: { id: guestId },
      include: { weddingEvent: true },
    });

    if (!guest || guest.weddingEvent.ownerId !== user.id) {
      return { error: "Guest not found" };
    }

    // Check phone number
    if (!guest.phoneNumber) {
      return { error: "Guest has no phone number" };
    }

    // Check usage before sending (WhatsApp only for interactive)
    const remaining = await getRemainingMessages(user.id);
    if (remaining.whatsapp <= 0) {
      return { error: "WhatsApp message limit reached", limitReached: true };
    }

    // Get notification service and send interactive message
    const notificationService = await getNotificationService();
    const result = await notificationService.sendInteractiveInvite(
      guest,
      guest.weddingEvent,
      includeImage,
      whatsappContentSid
    );

    // Log to database
    await prisma.notificationLog.create({
      data: {
        guestId: guest.id,
        type: NotificationType.INTERACTIVE_INVITE,
        channel: NotificationChannel.WHATSAPP,
        status: result.status,
        providerResponse: result.providerResponse,
        sentAt: result.success ? new Date() : null,
      },
    });

    // Update usage tracking if message was sent
    if (result.success) {
      await checkAndUpdateUsage(user.id, NotificationChannel.WHATSAPP, 1);

      // Log cost for this message
      await logMessageCost(user.id, guest.weddingEventId, guest.id, NotificationChannel.WHATSAPP, NotificationType.INTERACTIVE_INVITE);

      // Trigger automation scheduling for NO_RESPONSE flows
      await onNotificationSent({
        guestId: guest.id,
        weddingEventId: guest.weddingEventId,
        notificationType: "INTERACTIVE_INVITE",
        sentAt: new Date(),
      });
    }

    revalidatePath(`/dashboard/events/${guest.weddingEventId}`);

    if (!result.success && result.error) {
      return { error: result.error, channel: "WHATSAPP" };
    }

    return { success: result.success, channel: "WHATSAPP" };
  } catch (error) {
    console.error("Error sending interactive invite:", error);
    return { error: "Failed to send interactive invite" };
  }
}

// Send interactive reminder with buttons (WhatsApp only)
export async function sendInteractiveReminder(guestId: string, includeImage: boolean = false, whatsappContentSid?: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Get guest with event and RSVP
    const guest = await prisma.guest.findFirst({
      where: { id: guestId },
      include: { weddingEvent: true, rsvp: true },
    });

    if (!guest || guest.weddingEvent.ownerId !== user.id) {
      return { error: "Guest not found" };
    }

    // Check phone number
    if (!guest.phoneNumber) {
      return { error: "Guest has no phone number" };
    }

    // Check usage before sending (WhatsApp only for interactive)
    const remaining = await getRemainingMessages(user.id);
    if (remaining.whatsapp <= 0) {
      return { error: "WhatsApp message limit reached", limitReached: true };
    }

    // Get notification service and send interactive message
    const notificationService = await getNotificationService();
    const result = await notificationService.sendInteractiveReminder(
      guest,
      guest.weddingEvent,
      includeImage,
      whatsappContentSid
    );

    // Log to database
    await prisma.notificationLog.create({
      data: {
        guestId: guest.id,
        type: NotificationType.INTERACTIVE_REMINDER,
        channel: NotificationChannel.WHATSAPP,
        status: result.status,
        providerResponse: result.providerResponse,
        sentAt: result.success ? new Date() : null,
      },
    });

    // Update usage tracking if message was sent
    if (result.success) {
      await checkAndUpdateUsage(user.id, NotificationChannel.WHATSAPP, 1);

      // Log cost for this message
      await logMessageCost(user.id, guest.weddingEventId, guest.id, NotificationChannel.WHATSAPP, NotificationType.INTERACTIVE_REMINDER);

      // Trigger automation scheduling for NO_RESPONSE flows
      await onNotificationSent({
        guestId: guest.id,
        weddingEventId: guest.weddingEventId,
        notificationType: "INTERACTIVE_REMINDER",
        sentAt: new Date(),
      });
    }

    revalidatePath(`/dashboard/events/${guest.weddingEventId}`);

    if (!result.success && result.error) {
      return { error: result.error, channel: "WHATSAPP" };
    }

    return { success: result.success, channel: "WHATSAPP" };
  } catch (error) {
    console.error("Error sending interactive reminder:", error);
    return { error: "Failed to send interactive reminder" };
  }
}

/**
 * Get failed/undelivered notifications for an event
 */
export async function getFailedNotifications(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles?.includes(UserRole.ROLE_WEDDING_OWNER)) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      select: { id: true },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Fetch failed and undelivered notifications
    const failedNotifications = await prisma.notificationLog.findMany({
      where: {
        guest: {
          weddingEventId: eventId,
        },
        status: { in: ["FAILED", "UNDELIVERED"] },
      },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      notifications: failedNotifications.map((n) => ({
        id: n.id,
        guestId: n.guestId,
        guestName: n.guest.name,
        guestPhone: n.guest.phoneNumber,
        guestSlug: n.guest.slug,
        type: n.type,
        channel: n.channel,
        status: n.status,
        errorCode: n.errorCode,
        errorMessage: n.errorMessage,
        twilioStatus: n.twilioStatus,
        sentAt: n.sentAt,
        createdAt: n.createdAt,
      })),
    };
  } catch (error) {
    console.error("Error fetching failed notifications:", error);
    return { error: "Failed to fetch failed notifications" };
  }
}

/**
 * Get count of failed notifications for an event (for badge)
 */
export async function getFailedNotificationsCount(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles?.includes(UserRole.ROLE_WEDDING_OWNER)) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      select: { id: true },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const count = await prisma.notificationLog.count({
      where: {
        guest: {
          weddingEventId: eventId,
        },
        status: { in: ["FAILED", "UNDELIVERED"] },
      },
    });

    return { success: true, count };
  } catch (error) {
    console.error("Error counting failed notifications:", error);
    return { error: "Failed to count failed notifications" };
  }
}

/**
 * Retry a failed notification
 */
export async function retryFailedNotification(notificationId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles?.includes(UserRole.ROLE_WEDDING_OWNER)) {
      return { error: "Unauthorized" };
    }

    // Fetch the failed notification with guest and event
    const notification = await prisma.notificationLog.findUnique({
      where: { id: notificationId },
      include: {
        guest: {
          include: {
            weddingEvent: true,
          },
        },
      },
    });

    if (!notification) {
      return { error: "Notification not found" };
    }

    // Verify event ownership
    if (notification.guest.weddingEvent.ownerId !== user.id) {
      return { error: "Unauthorized" };
    }

    // Check if it's actually a failed notification
    if (notification.status !== "FAILED" && notification.status !== "UNDELIVERED") {
      return { error: "This notification is not in a failed state" };
    }

    const guest = notification.guest;
    const event = notification.guest.weddingEvent;

    // Get the notification service
    const notificationService = await getNotificationService();

    // Determine which send method to use based on the original type
    let result;
    switch (notification.type) {
      case "INVITE":
        result = await notificationService.sendInvite(guest, event, notification.channel);
        break;
      case "REMINDER":
        result = await notificationService.sendReminder(guest, event, notification.channel);
        break;
      case "INTERACTIVE_INVITE":
        result = await notificationService.sendInteractiveInvite(guest, event);
        break;
      case "INTERACTIVE_REMINDER":
        result = await notificationService.sendInteractiveReminder(guest, event);
        break;
      default:
        // For other types, try a basic invite
        result = await notificationService.sendInvite(guest, event, notification.channel);
    }

    // Create a new notification log for the retry
    await prisma.notificationLog.create({
      data: {
        guestId: guest.id,
        type: notification.type,
        channel: result.channel || notification.channel,
        status: result.status,
        providerResponse: result.providerResponse || null,
        sentAt: result.success ? new Date() : null,
      },
    });

    // Update usage tracking if successful
    if (result.success && result.channel) {
      await checkAndUpdateUsage(user.id, result.channel, 1);

      // Log cost for this message
      await logMessageCost(user.id, event.id, guest.id, result.channel, notification.type);
    }

    revalidatePath(`/dashboard/events/${event.id}`);

    if (!result.success && result.error) {
      return { error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error retrying notification:", error);
    return { error: "Failed to retry notification" };
  }
}

/**
 * Update the message status for a guest's most recent notification
 */
export async function updateGuestMessageStatus(
  guestId: string,
  newStatus: "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "UNDELIVERED"
) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles?.includes(UserRole.ROLE_WEDDING_OWNER)) {
      return { error: "Unauthorized" };
    }

    // Get the guest and verify ownership
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        weddingEvent: true,
        notificationLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!guest || guest.weddingEvent.ownerId !== user.id) {
      return { error: "Guest not found" };
    }

    // If there's an existing notification log, update its status
    if (guest.notificationLogs.length > 0) {
      await prisma.notificationLog.update({
        where: { id: guest.notificationLogs[0].id },
        data: {
          status: newStatus,
          // Clear error fields when setting to a non-failed status
          ...(newStatus !== "FAILED" && newStatus !== "UNDELIVERED" ? {
            errorCode: null,
            errorMessage: null,
          } : {}),
        },
      });
    } else {
      // If no notification log exists, create one with the specified status
      await prisma.notificationLog.create({
        data: {
          guestId: guest.id,
          type: "INVITE",
          channel: "WHATSAPP",
          status: newStatus,
          sentAt: newStatus === "SENT" || newStatus === "DELIVERED" ? new Date() : null,
        },
      });
    }

    revalidatePath(`/dashboard/events/${guest.weddingEventId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating message status:", error);
    return { error: "Failed to update message status" };
  }
}

/**
 * Get the current message status for a guest
 */
export async function getGuestMessageStatus(guestId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles?.includes(UserRole.ROLE_WEDDING_OWNER)) {
      return { error: "Unauthorized" };
    }

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        weddingEvent: true,
        notificationLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!guest || guest.weddingEvent.ownerId !== user.id) {
      return { error: "Guest not found" };
    }

    const latestLog = guest.notificationLogs[0];

    return {
      success: true,
      status: latestLog?.status || null,
      type: latestLog?.type || null,
      errorCode: latestLog?.errorCode || null,
      errorMessage: latestLog?.errorMessage || null,
    };
  } catch (error) {
    console.error("Error getting message status:", error);
    return { error: "Failed to get message status" };
  }
}
