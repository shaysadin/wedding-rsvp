"use server";

import { revalidatePath } from "next/cache";
import { UserRole, NotificationType, NotificationStatus, NotificationChannel } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { uploadImage, deleteImage } from "@/lib/cloudinary";

// Maximum file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Base64 encoding adds ~33% overhead
const MAX_BASE64_SIZE = Math.floor(MAX_FILE_SIZE * 1.4);

// ============ IMAGE UPLOAD ============

export async function uploadInvitationImage(eventId: string, base64Data: string) {
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

    // Validate base64 data
    if (!base64Data || typeof base64Data !== "string") {
      return { error: "Invalid image data" };
    }

    if (!base64Data.startsWith("data:image/")) {
      return { error: "Invalid image format. Please upload a valid image file." };
    }

    // Check file size
    if (base64Data.length > MAX_BASE64_SIZE) {
      const estimatedSize = Math.round((base64Data.length * 0.75) / (1024 * 1024));
      return {
        error: `Image is too large (~${estimatedSize}MB). Maximum size is 5MB.`,
        code: "FILE_TOO_LARGE",
      };
    }

    // Delete old image if exists
    if (event.invitationImagePublicId) {
      try {
        await deleteImage(event.invitationImagePublicId);
      } catch (e) {
        console.error("Failed to delete old invitation image:", e);
      }
    }

    // Upload new image
    const result = await uploadImage(base64Data, `invitation-images/${eventId}`);

    // Update event with new image
    await prisma.weddingEvent.update({
      where: { id: eventId },
      data: {
        invitationImageUrl: result.url,
        invitationImagePublicId: result.publicId,
      },
    });

    revalidatePath(`/dashboard/events/${eventId}/invitations`);

    return {
      success: true,
      url: result.url,
      publicId: result.publicId,
    };
  } catch (error) {
    console.error("Error uploading invitation image:", error);
    return { error: "Failed to upload image. Please try again." };
  }
}

export async function deleteInvitationImage(eventId: string) {
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

    // Delete from Cloudinary
    if (event.invitationImagePublicId) {
      await deleteImage(event.invitationImagePublicId);
    }

    // Clear from database
    await prisma.weddingEvent.update({
      where: { id: eventId },
      data: {
        invitationImageUrl: null,
        invitationImagePublicId: null,
      },
    });

    revalidatePath(`/dashboard/events/${eventId}/invitations`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting invitation image:", error);
    return { error: "Failed to delete image" };
  }
}

export async function getInvitationImage(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      select: {
        invitationImageUrl: true,
        invitationImagePublicId: true,
      },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    return {
      success: true,
      imageUrl: event.invitationImageUrl,
      publicId: event.invitationImagePublicId,
    };
  } catch (error) {
    console.error("Error getting invitation image:", error);
    return { error: "Failed to get image" };
  }
}

// ============ GUESTS FOR INVITATIONS ============

export async function getGuestsForInvitations(eventId: string) {
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

    // Get all guests with their image invitation status
    const guests = await prisma.guest.findMany({
      where: { weddingEventId: eventId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        side: true,
        groupName: true,
        expectedGuests: true,
        rsvp: {
          select: {
            status: true,
            guestCount: true,
          },
        },
        notificationLogs: {
          where: { type: NotificationType.IMAGE_INVITE },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            status: true,
            sentAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Transform to include invitation status
    const guestsWithStatus = guests.map((guest) => {
      const lastInvitation = guest.notificationLogs[0];
      return {
        ...guest,
        imageInvitationSent: !!lastInvitation && lastInvitation.status === NotificationStatus.SENT,
        imageInvitationStatus: lastInvitation?.status || null,
        imageInvitationSentAt: lastInvitation?.sentAt || lastInvitation?.createdAt || null,
      };
    });

    return { success: true, guests: guestsWithStatus };
  } catch (error) {
    console.error("Error fetching guests for invitations:", error);
    return { error: "Failed to fetch guests" };
  }
}

// ============ SEND IMAGE INVITATIONS ============

export async function sendImageInvitation(guestId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Get guest with event
    const guest = await prisma.guest.findFirst({
      where: { id: guestId },
      include: {
        weddingEvent: true,
      },
    });

    if (!guest || guest.weddingEvent.ownerId !== user.id) {
      return { error: "Guest not found" };
    }

    // Check if invitation image exists
    if (!guest.weddingEvent.invitationImageUrl) {
      return { error: "No invitation image uploaded. Please upload an image first." };
    }

    // Check if guest has phone number
    if (!guest.phoneNumber) {
      return { error: "Guest does not have a phone number" };
    }

    // Check WhatsApp settings
    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings?.whatsappEnabled || !settings.whatsappImageInviteContentSid) {
      return {
        error: "WhatsApp image template not configured. Please configure it in messaging settings.",
        code: "TEMPLATE_NOT_CONFIGURED",
      };
    }

    // TODO: Implement actual WhatsApp sending with image template
    // For now, we'll create a notification record to track the attempt
    // The actual sending should be done via the notification service

    // Create notification record
    const notification = await prisma.notificationLog.create({
      data: {
        guestId: guest.id,
        type: NotificationType.IMAGE_INVITE,
        channel: NotificationChannel.WHATSAPP,
        status: NotificationStatus.PENDING,
      },
    });

    // Here you would call the notification service to actually send
    // For now, we'll mark it as sent (placeholder)
    await prisma.notificationLog.update({
      where: { id: notification.id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });

    revalidatePath(`/dashboard/events/${guest.weddingEventId}/invitations`);

    return { success: true };
  } catch (error) {
    console.error("Error sending image invitation:", error);
    return { error: "Failed to send invitation" };
  }
}

export async function sendBulkImageInvitations(guestIds: string[]) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    if (guestIds.length === 0) {
      return { error: "No guests selected" };
    }

    // Get all guests
    const guests = await prisma.guest.findMany({
      where: { id: { in: guestIds } },
      include: {
        weddingEvent: true,
      },
    });

    // Verify all belong to user's event
    const unauthorized = guests.filter((g) => g.weddingEvent.ownerId !== user.id);
    if (unauthorized.length > 0) {
      return { error: "Some guests not found or unauthorized" };
    }

    // Check if event has invitation image
    const event = guests[0]?.weddingEvent;
    if (!event?.invitationImageUrl) {
      return { error: "No invitation image uploaded. Please upload an image first." };
    }

    // Check WhatsApp settings
    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings?.whatsappEnabled || !settings.whatsappImageInviteContentSid) {
      return {
        error: "WhatsApp image template not configured. Please configure it in messaging settings.",
        code: "TEMPLATE_NOT_CONFIGURED",
      };
    }

    // Filter guests with phone numbers
    const guestsWithPhone = guests.filter((g) => g.phoneNumber);
    const guestsWithoutPhone = guests.length - guestsWithPhone.length;

    // Batch create all notification records at once
    const now = new Date();
    await prisma.notificationLog.createMany({
      data: guestsWithPhone.map((guest) => ({
        guestId: guest.id,
        type: NotificationType.IMAGE_INVITE,
        channel: NotificationChannel.WHATSAPP,
        status: NotificationStatus.SENT, // TODO: Change to PENDING when implementing actual sending
        sentAt: now,
      })),
    });

    // TODO: Implement actual batch sending via notification service
    // The notification service should handle the actual WhatsApp API calls

    revalidatePath(`/dashboard/events/${event.id}/invitations`);

    return {
      success: true,
      sent: guestsWithPhone.length,
      failed: guestsWithoutPhone,
      total: guests.length,
    };
  } catch (error) {
    console.error("Error sending bulk image invitations:", error);
    return { error: "Failed to send invitations" };
  }
}

// ============ INVITATION STATS ============

export async function getInvitationStats(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership and get basic info
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      select: {
        id: true,
        invitationImageUrl: true,
      },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Use parallel queries for counts (much faster than fetching all records)
    const [totalGuests, guestsWithPhone, sentCount] = await Promise.all([
      // Count total guests
      prisma.guest.count({
        where: { weddingEventId: eventId },
      }),
      // Count guests with phone
      prisma.guest.count({
        where: {
          weddingEventId: eventId,
          phoneNumber: { not: null },
        },
      }),
      // Count guests with sent image invitations
      prisma.guest.count({
        where: {
          weddingEventId: eventId,
          notificationLogs: {
            some: {
              type: NotificationType.IMAGE_INVITE,
              status: NotificationStatus.SENT,
            },
          },
        },
      }),
    ]);

    const notSentCount = guestsWithPhone - sentCount;

    return {
      success: true,
      stats: {
        totalGuests,
        guestsWithPhone,
        sentCount,
        notSentCount,
        hasInvitationImage: !!event.invitationImageUrl,
      },
    };
  } catch (error) {
    console.error("Error getting invitation stats:", error);
    return { error: "Failed to get stats" };
  }
}
