"use server";

import { revalidatePath } from "next/cache";
import { InvitationFieldType, UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { generateInvitationWithAI, InvitationField } from "@/lib/gemini";
import { uploadToR2, getPublicR2Url } from "@/lib/r2";

/**
 * Generate an invitation using AI
 */
export async function generateInvitation(input: {
  eventId: string;
  templateId: string;
  fieldValues: Array<{
    fieldType: InvitationFieldType;
    value: string;
  }>;
}) {
  try {
    const user = await getCurrentUser();
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: input.eventId,
        ownerId: user.id,
      },
    });

    if (!event) {
      return { error: "Event not found or unauthorized" };
    }

    // Get template with fields
    const template = await prisma.invitationTemplate.findUnique({
      where: { id: input.templateId },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!template) {
      return { error: "Template not found" };
    }

    if (!template.imageUrl) {
      return { error: "Template image not found" };
    }

    // Validate required fields
    const requiredFields = template.fields.filter((f) => f.isRequired);
    for (const field of requiredFields) {
      const value = input.fieldValues.find((v) => v.fieldType === field.fieldType);
      if (!value || !value.value.trim()) {
        return { error: `Missing required field: ${field.labelHe || field.label}` };
      }
    }

    // Fetch the template image
    console.log("[generate-invitation] Fetching template image...");
    const imageResponse = await fetch(template.imageUrl);
    if (!imageResponse.ok) {
      return { error: "Failed to fetch template image" };
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    const imageMimeType = imageResponse.headers.get("content-type") || "image/png";

    // Build field replacements for AI
    const fieldsWithValues = template.fields
      .map((field) => {
        const newValue = input.fieldValues.find((v) => v.fieldType === field.fieldType)?.value;
        if (!newValue) return null;

        return {
          fieldType: field.fieldType as string,
          label: field.label,
          labelHe: field.labelHe || field.label,
          originalValue: field.originalValue,
          newValue: newValue,
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    const fields: InvitationField[] = fieldsWithValues;

    if (fields.length === 0) {
      return { error: "No field values provided" };
    }

    // Generate invitation with AI - use Pro model for final generation
    console.log("[generate-invitation] Calling Gemini API with Pro model...");
    const result = await generateInvitationWithAI({
      templateImageBase64: imageBase64,
      templateImageMimeType: imageMimeType,
      fields,
      imageSize: "2K",
      useProModel: true, // Use higher quality model for final generation
    });

    if (!result.success || !result.imageBase64) {
      return { error: result.error || "Failed to generate invitation" };
    }

    // Upload generated image to R2
    console.log("[generate-invitation] Uploading to R2...");
    const timestamp = Date.now();
    const imageKey = `generated-invitations/${event.id}/${timestamp}.png`;
    const imageBuffer2 = Buffer.from(result.imageBase64, "base64");

    await uploadToR2(imageKey, imageBuffer2, result.imageMimeType || "image/png");
    const pngUrl = await getPublicR2Url(imageKey);

    // Save to database (don't auto-set as active - user should choose)
    const generation = await prisma.generatedInvitation.create({
      data: {
        weddingEventId: event.id,
        templateId: template.id,
        pngUrl,
        fieldValues: input.fieldValues,
      },
    });

    revalidatePath(`/[locale]/dashboard/events/${event.id}`);
    revalidatePath(`/[locale]/dashboard/events/${event.id}/invitations`);

    return {
      success: true,
      pngUrl,
      id: generation.id,
      generation,
    };
  } catch (error) {
    console.error("Error generating invitation:", error);
    return { error: error instanceof Error ? error.message : "Failed to generate invitation" };
  }
}

/**
 * Preview an invitation (without saving)
 */
export async function previewInvitation(input: {
  templateId: string;
  fieldValues: Array<{
    fieldType: InvitationFieldType;
    value: string;
  }>;
}) {
  try {
    const user = await getCurrentUser();
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Get template with fields
    const template = await prisma.invitationTemplate.findUnique({
      where: { id: input.templateId },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!template) {
      return { error: "Template not found" };
    }

    if (!template.imageUrl) {
      return { error: "Template image not found" };
    }

    // Fetch the template image
    const imageResponse = await fetch(template.imageUrl);
    if (!imageResponse.ok) {
      return { error: "Failed to fetch template image" };
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    const imageMimeType = imageResponse.headers.get("content-type") || "image/png";

    // Build field replacements for AI
    const previewFieldsWithValues = template.fields
      .map((field) => {
        const newValue = input.fieldValues.find((v) => v.fieldType === field.fieldType)?.value;
        if (!newValue) return null;

        return {
          fieldType: field.fieldType as string,
          label: field.label,
          labelHe: field.labelHe || field.label,
          originalValue: field.originalValue,
          newValue: newValue,
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    const fields: InvitationField[] = previewFieldsWithValues;

    if (fields.length === 0) {
      return { error: "No field values provided" };
    }

    // Generate preview with AI - use faster model for previews
    console.log("[preview-invitation] Calling Gemini API for preview...");
    const result = await generateInvitationWithAI({
      templateImageBase64: imageBase64,
      templateImageMimeType: imageMimeType,
      fields,
      imageSize: "1K", // Lower quality for faster preview
      useProModel: false, // Use faster model for previews
    });

    if (!result.success || !result.imageBase64) {
      return { error: result.error || "Failed to generate preview" };
    }

    return {
      success: true,
      previewUrl: `data:${result.imageMimeType || "image/png"};base64,${result.imageBase64}`,
    };
  } catch (error) {
    console.error("Error generating preview:", error);
    return { error: error instanceof Error ? error.message : "Failed to generate preview" };
  }
}

/**
 * Get generated invitations for an event
 */
export async function getEventInvitations(eventId: string) {
  try {
    const user = await getCurrentUser();
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: eventId,
        ownerId: user.id,
      },
    });

    if (!event) {
      return { error: "Event not found or unauthorized" };
    }

    const invitations = await prisma.generatedInvitation.findMany({
      where: { weddingEventId: eventId },
      include: {
        template: {
          select: {
            name: true,
            nameHe: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { invitations };
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return { error: "Failed to fetch invitations" };
  }
}

/**
 * Delete a generated invitation
 */
export async function deleteGeneratedInvitation(invitationId: string) {
  try {
    const user = await getCurrentUser();
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through event
    const invitation = await prisma.generatedInvitation.findFirst({
      where: { id: invitationId },
      include: {
        weddingEvent: {
          select: { ownerId: true, id: true },
        },
      },
    });

    if (!invitation || invitation.weddingEvent.ownerId !== user.id) {
      return { error: "Invitation not found or unauthorized" };
    }

    await prisma.generatedInvitation.delete({
      where: { id: invitationId },
    });

    revalidatePath(`/[locale]/dashboard/events/${invitation.weddingEvent.id}/invitations`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting invitation:", error);
    return { error: "Failed to delete invitation" };
  }
}

/**
 * Get the current invitation image URL for an event
 */
export async function getInvitationImage(eventId: string) {
  try {
    const user = await getCurrentUser();
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      console.log("[getInvitationImage] No user found or missing role");
      return { error: "Unauthorized" };
    }

    console.log("[getInvitationImage] Fetching for eventId:", eventId, "userId:", user.id);

    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: eventId,
        ownerId: user.id,
      },
      select: {
        invitationImageUrl: true,
      },
    });

    console.log("[getInvitationImage] Event found:", event);

    if (!event) {
      return { error: "Event not found or unauthorized" };
    }

    return { imageUrl: event.invitationImageUrl };
  } catch (error) {
    console.error("Error fetching invitation image:", error);
    return { error: "Failed to fetch invitation image" };
  }
}

/**
 * Get guests for invitation sending
 */
export async function getGuestsForInvitations(eventId: string) {
  try {
    const user = await getCurrentUser();
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: eventId,
        ownerId: user.id,
      },
    });

    if (!event) {
      return { error: "Event not found or unauthorized" };
    }

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
          where: { type: "IMAGE_INVITE" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            status: true,
            sentAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to include invitation status fields
    const guestsWithInvitationStatus = guests.map((guest) => {
      const imageInviteLog = guest.notificationLogs[0];
      return {
        id: guest.id,
        name: guest.name,
        phoneNumber: guest.phoneNumber,
        side: guest.side,
        groupName: guest.groupName,
        expectedGuests: guest.expectedGuests,
        rsvp: guest.rsvp,
        imageInvitationSent: imageInviteLog?.status === "SENT",
        imageInvitationStatus: imageInviteLog?.status || null,
        imageInvitationSentAt: imageInviteLog?.sentAt || null,
      };
    });

    return { guests: guestsWithInvitationStatus };
  } catch (error) {
    console.error("Error fetching guests:", error);
    return { error: "Failed to fetch guests" };
  }
}

/**
 * Send invitation image to a single guest via WhatsApp
 */
export async function sendImageInvitation(guestId: string) {
  try {
    const user = await getCurrentUser();
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const guest = await prisma.guest.findFirst({
      where: { id: guestId },
      include: {
        weddingEvent: {
          select: {
            id: true,
            ownerId: true,
            invitationImageUrl: true,
            title: true,
          },
        },
      },
    });

    if (!guest || guest.weddingEvent.ownerId !== user.id) {
      return { error: "Guest not found or unauthorized" };
    }

    if (!guest.phoneNumber) {
      return { error: "Guest has no phone number" };
    }

    if (!guest.weddingEvent.invitationImageUrl) {
      return { error: "No invitation image available" };
    }

    // Import and use the WhatsApp sending function
    const { sendWhatsAppImage } = await import("@/lib/notifications/whatsapp");

    const result = await sendWhatsAppImage({
      to: guest.phoneNumber,
      imageUrl: guest.weddingEvent.invitationImageUrl,
      caption: `הזמנה ל${guest.weddingEvent.title}`,
    });

    if (!result.success) {
      return { error: result.error || "Failed to send invitation" };
    }

    // Create notification log entry
    await prisma.notificationLog.create({
      data: {
        guestId: guestId,
        type: "IMAGE_INVITE",
        channel: "WHATSAPP",
        status: "PENDING",
        sentAt: new Date(),
      },
    });

    revalidatePath(`/[locale]/dashboard/events/${guest.weddingEvent.id}/invitations`);
    return { success: true };
  } catch (error) {
    console.error("Error sending invitation:", error);
    return { error: error instanceof Error ? error.message : "Failed to send invitation" };
  }
}

/**
 * Send invitation image to multiple guests via WhatsApp
 */
export async function sendBulkImageInvitations(guestIds: string[]) {
  try {
    const user = await getCurrentUser();
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    if (guestIds.length === 0) {
      return { error: "No guests selected" };
    }

    // Get all guests and verify ownership
    const guests = await prisma.guest.findMany({
      where: { id: { in: guestIds } },
      include: {
        weddingEvent: {
          select: {
            id: true,
            ownerId: true,
            invitationImageUrl: true,
            title: true,
          },
        },
      },
    });

    // Verify all guests belong to the user
    const invalidGuests = guests.filter((g) => g.weddingEvent.ownerId !== user.id);
    if (invalidGuests.length > 0) {
      return { error: "Some guests not found or unauthorized" };
    }

    // Check for invitation image
    const eventWithImage = guests.find((g) => g.weddingEvent.invitationImageUrl);
    if (!eventWithImage) {
      return { error: "No invitation image available" };
    }

    const { sendWhatsAppImage } = await import("@/lib/notifications/whatsapp");

    let sent = 0;
    let failed = 0;

    for (const guest of guests) {
      if (!guest.phoneNumber || !guest.weddingEvent.invitationImageUrl) {
        failed++;
        continue;
      }

      try {
        const result = await sendWhatsAppImage({
          to: guest.phoneNumber,
          imageUrl: guest.weddingEvent.invitationImageUrl,
          caption: `הזמנה ל${guest.weddingEvent.title}`,
        });

        if (result.success) {
          await prisma.notificationLog.create({
            data: {
              guestId: guest.id,
              type: "IMAGE_INVITE",
              channel: "WHATSAPP",
              status: "PENDING",
              sentAt: new Date(),
            },
          });
          sent++;
        } else {
          // Log failed attempt with error details
          await prisma.notificationLog.create({
            data: {
              guestId: guest.id,
              type: "IMAGE_INVITE",
              channel: "WHATSAPP",
              status: "FAILED",
              providerResponse: JSON.stringify({ error: result.error }),
              sentAt: new Date(),
            },
          });
          failed++;
        }
      } catch (error) {
        // Log unexpected errors
        await prisma.notificationLog.create({
          data: {
            guestId: guest.id,
            type: "IMAGE_INVITE",
            channel: "WHATSAPP",
            status: "FAILED",
            providerResponse: JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown error"
            }),
            sentAt: new Date(),
          },
        });
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const eventId = guests[0]?.weddingEvent.id;
    if (eventId) {
      revalidatePath(`/[locale]/dashboard/events/${eventId}/invitations`);
    }

    return { success: true, sent, failed, total: guests.length };
  } catch (error) {
    console.error("Error sending bulk invitations:", error);
    return { error: error instanceof Error ? error.message : "Failed to send invitations" };
  }
}

/**
 * Set a specific generated invitation as the active one for the event
 * Uploads to Cloudinary for WhatsApp compatibility
 */
export async function setActiveInvitation(invitationId: string) {
  try {
    const user = await getCurrentUser();
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const invitation = await prisma.generatedInvitation.findFirst({
      where: { id: invitationId },
      include: {
        weddingEvent: {
          select: { id: true, ownerId: true },
        },
      },
    });

    if (!invitation || invitation.weddingEvent.ownerId !== user.id) {
      return { error: "Invitation not found or unauthorized" };
    }

    if (!invitation.pngUrl) {
      return { error: "Invitation image not found" };
    }

    // Fetch the image from R2 and upload to Cloudinary
    // WhatsApp templates require Cloudinary URLs
    console.log("[setActiveInvitation] Fetching image from R2:", invitation.pngUrl);
    const imageResponse = await fetch(invitation.pngUrl);
    if (!imageResponse.ok) {
      return { error: "Failed to fetch invitation image" };
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/png";

    // Upload to Cloudinary
    console.log("[setActiveInvitation] Uploading to Cloudinary...");
    const { uploadImage } = await import("@/lib/cloudinary");
    const cloudinaryResult = await uploadImage(
      `data:${mimeType};base64,${imageBase64}`,
      `invitations/${invitation.weddingEvent.id}`
    );

    console.log("[setActiveInvitation] Cloudinary URL:", cloudinaryResult.url);

    // Update event with Cloudinary URL
    await prisma.weddingEvent.update({
      where: { id: invitation.weddingEvent.id },
      data: { invitationImageUrl: cloudinaryResult.url },
    });

    revalidatePath(`/[locale]/dashboard/events/${invitation.weddingEvent.id}/invitations`);
    return { success: true, cloudinaryUrl: cloudinaryResult.url };
  } catch (error) {
    console.error("Error setting active invitation:", error);
    return { error: error instanceof Error ? error.message : "Failed to set active invitation" };
  }
}
