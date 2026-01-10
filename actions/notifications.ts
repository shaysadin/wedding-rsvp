"use server";

import { revalidatePath } from "next/cache";
import { UserRole, NotificationType, NotificationChannel, PlanTier } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getNotificationService } from "@/lib/notifications";
import { PLAN_LIMITS, BUSINESS_VOICE_ADDON_CALLS, getVoiceCallLimit } from "@/config/plans";
import { onNotificationSent } from "@/lib/automation/event-handlers";

export type ChannelType = "WHATSAPP" | "SMS" | "AUTO";

// Helper to check and update usage
async function checkAndUpdateUsage(
  userId: string,
  channel: NotificationChannel,
  count: number = 1
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  // Get user with usage tracking
  const user = await prisma.user.findUnique({
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

  if (channel === NotificationChannel.WHATSAPP) {
    const totalAllowed = planLimits.maxWhatsappMessages + (usage.whatsappBonus || 0);
    const remaining = totalAllowed - usage.whatsappSent;

    if (remaining < count) {
      return {
        allowed: false,
        remaining,
        error: `WhatsApp message limit reached. ${remaining} messages remaining.`,
      };
    }

    // Update usage
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

    return { allowed: true, remaining: remaining - count };
  }

  if (channel === NotificationChannel.SMS) {
    const totalAllowed = planLimits.maxSmsMessages + (usage.smsBonus || 0);
    const remaining = totalAllowed - usage.smsSent;

    if (remaining < count) {
      return {
        allowed: false,
        remaining,
        error: `SMS message limit reached. ${remaining} messages remaining.`,
      };
    }

    // Update usage
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

    return { allowed: true, remaining: remaining - count };
  }

  return { allowed: true, remaining: 0 };
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

    // Only send reminder if RSVP is pending
    if (guest.rsvp && guest.rsvp.status !== "PENDING") {
      return { error: "Guest has already responded" };
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

    if (uninvitedGuests.length === 0) {
      return { success: true, sent: 0, message: "All guests have been invited" };
    }

    // Check remaining messages
    const remaining = await getRemainingMessages(user.id);
    if (remaining.whatsapp <= 0 && remaining.sms <= 0) {
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

    for (const guest of uninvitedGuests) {
      // Check remaining using local tracking (avoids DB query per guest)
      if (currentRemaining.whatsapp <= 0 && currentRemaining.sms <= 0) {
        skippedLimit++;
        continue;
      }

      try {
        const result = await notificationService.sendInvite(guest, guest.weddingEvent);

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

        if (result.success) {
          await checkAndUpdateUsage(user.id, result.channel, 1);
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
        console.error(`Error sending invite to guest ${guest.id}:`, error);
        failed++;
      }
    }

    revalidatePath(`/dashboard/events/${eventId}`);

    return {
      success: true,
      sent,
      failed,
      skippedLimit,
      total: uninvitedGuests.length,
    };
  } catch (error) {
    console.error("Error sending bulk invites:", error);
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
