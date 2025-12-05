"use server";

import { revalidatePath } from "next/cache";
import { UserRole, NotificationType, NotificationChannel } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getNotificationService } from "@/lib/notifications";

export type ChannelType = "WHATSAPP" | "SMS" | "AUTO";

export async function sendInvite(guestId: string, channel: ChannelType = "AUTO") {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

    // Send notification
    const notificationService = await getNotificationService();
    const preferredChannel = channel === "AUTO" ? undefined : (channel as NotificationChannel);
    const result = await notificationService.sendInvite(guest, guest.weddingEvent, preferredChannel);

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

export async function sendReminder(guestId: string, channel: ChannelType = "AUTO") {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

    // Send notification
    const notificationService = await getNotificationService();
    const preferredChannel = channel === "AUTO" ? undefined : (channel as NotificationChannel);
    const result = await notificationService.sendReminder(guest, guest.weddingEvent, preferredChannel);

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

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

    // Get notification service once for all guests
    const notificationService = await getNotificationService();

    // Send reminders to all pending guests
    let sent = 0;
    let failed = 0;

    for (const guest of pendingGuests) {
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

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Get all guests who haven't received an invite yet
    const uninvitedGuests = await prisma.guest.findMany({
      where: {
        weddingEventId: eventId,
        notificationLogs: {
          none: {
            type: NotificationType.INVITE,
            status: "SENT",
          },
        },
      },
      include: { weddingEvent: true },
    });

    if (uninvitedGuests.length === 0) {
      return { success: true, sent: 0, message: "All guests have been invited" };
    }

    // Get notification service once for all guests
    const notificationService = await getNotificationService();

    // Send invites to all uninvited guests
    let sent = 0;
    let failed = 0;

    for (const guest of uninvitedGuests) {
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
      total: uninvitedGuests.length,
    };
  } catch (error) {
    console.error("Error sending bulk invites:", error);
    return { error: "Failed to send invites" };
  }
}
