"use server";

import { revalidatePath } from "next/cache";
import { UserRole, NotificationType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Default templates in Hebrew and English (only INVITE and REMINDER)
const DEFAULT_TEMPLATES = {
  he: {
    INVITE: {
      title: "הזמנה לאירוע",
      message: `שלום {{guestName}}!

אתם מוזמנים ל{{eventTitle}}!

נשמח מאוד אם תאשרו את הגעתכם בקישור הבא:
{{rsvpLink}}

מחכים לראותכם!`,
    },
    REMINDER: {
      title: "תזכורת - אישור הגעה",
      message: `שלום {{guestName}}!

רצינו להזכיר לכם לאשר את הגעתכם ל{{eventTitle}}.

לאישור הגעה:
{{rsvpLink}}

תודה!`,
    },
  },
  en: {
    INVITE: {
      title: "Event Invitation",
      message: `Hello {{guestName}}!

You are invited to {{eventTitle}}!

Please confirm your attendance using the link below:
{{rsvpLink}}

We look forward to seeing you!`,
    },
    REMINDER: {
      title: "RSVP Reminder",
      message: `Hello {{guestName}}!

This is a reminder to confirm your attendance at {{eventTitle}}.

Please RSVP here:
{{rsvpLink}}

Thank you!`,
    },
  },
};

export interface MessageTemplateInput {
  type: NotificationType;
  locale: string;
  title: string;
  message: string;
  isAcceptedVariant?: boolean;
  isActive?: boolean;
}

// Get all templates for an event
export async function getEventTemplates(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      select: {
        id: true,
        title: true,
        smsSenderId: true,
      },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const templates = await prisma.messageTemplate.findMany({
      where: { weddingEventId: eventId },
      orderBy: [{ type: "asc" }, { locale: "asc" }, { isAcceptedVariant: "asc" }],
    });

    return { success: true, templates, event };
  } catch (error) {
    console.error("Error fetching message templates:", error);
    return { error: "Failed to fetch templates" };
  }
}

// Create or update a template
export async function upsertTemplate(eventId: string, input: MessageTemplateInput) {
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

    const { type, locale, title, message, isAcceptedVariant = false, isActive = true } = input;

    // Use upsert with the unique constraint
    const template = await prisma.messageTemplate.upsert({
      where: {
        weddingEventId_type_locale_isAcceptedVariant: {
          weddingEventId: eventId,
          type,
          locale,
          isAcceptedVariant,
        },
      },
      update: {
        title,
        message,
        isActive,
      },
      create: {
        weddingEventId: eventId,
        type,
        locale,
        title,
        message,
        isAcceptedVariant,
        isActive,
      },
    });

    revalidatePath(`/dashboard/events/${eventId}/messages`);

    return { success: true, template };
  } catch (error) {
    console.error("Error upserting template:", error);
    return { error: "Failed to save template" };
  }
}

// Delete a template
export async function deleteTemplate(templateId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify template ownership through event
    const template = await prisma.messageTemplate.findFirst({
      where: { id: templateId },
      include: { weddingEvent: true },
    });

    if (!template || template.weddingEvent.ownerId !== user.id) {
      return { error: "Template not found" };
    }

    await prisma.messageTemplate.delete({
      where: { id: templateId },
    });

    revalidatePath(`/dashboard/events/${template.weddingEventId}/messages`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting template:", error);
    return { error: "Failed to delete template" };
  }
}

// Toggle template active status
export async function toggleTemplateActive(templateId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify template ownership through event
    const template = await prisma.messageTemplate.findFirst({
      where: { id: templateId },
      include: { weddingEvent: true },
    });

    if (!template || template.weddingEvent.ownerId !== user.id) {
      return { error: "Template not found" };
    }

    const updatedTemplate = await prisma.messageTemplate.update({
      where: { id: templateId },
      data: { isActive: !template.isActive },
    });

    revalidatePath(`/dashboard/events/${template.weddingEventId}/messages`);

    return { success: true, template: updatedTemplate };
  } catch (error) {
    console.error("Error toggling template:", error);
    return { error: "Failed to toggle template" };
  }
}

// Reset templates to defaults
export async function resetToDefaults(eventId: string, locale: string = "he") {
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

    const defaults = DEFAULT_TEMPLATES[locale as keyof typeof DEFAULT_TEMPLATES] || DEFAULT_TEMPLATES.he;

    // Delete existing templates for this locale
    await prisma.messageTemplate.deleteMany({
      where: { weddingEventId: eventId, locale },
    });

    // Create default templates (only INVITE and REMINDER)
    const templates = await prisma.messageTemplate.createMany({
      data: [
        {
          weddingEventId: eventId,
          type: NotificationType.INVITE,
          locale,
          title: defaults.INVITE.title,
          message: defaults.INVITE.message,
          isAcceptedVariant: false,
        },
        {
          weddingEventId: eventId,
          type: NotificationType.REMINDER,
          locale,
          title: defaults.REMINDER.title,
          message: defaults.REMINDER.message,
          isAcceptedVariant: false,
        },
      ],
    });

    revalidatePath(`/dashboard/events/${eventId}/messages`);

    return { success: true, count: templates.count };
  } catch (error) {
    console.error("Error resetting templates:", error);
    return { error: "Failed to reset templates" };
  }
}

// Initialize default templates for a new event
export async function initializeEventTemplates(eventId: string, locale: string = "he") {
  try {
    // Check if templates already exist
    const existingTemplates = await prisma.messageTemplate.findMany({
      where: { weddingEventId: eventId },
    });

    if (existingTemplates.length > 0) {
      return { success: true, message: "Templates already exist" };
    }

    const defaults = DEFAULT_TEMPLATES[locale as keyof typeof DEFAULT_TEMPLATES] || DEFAULT_TEMPLATES.he;

    // Create default templates (only INVITE and REMINDER)
    await prisma.messageTemplate.createMany({
      data: [
        {
          weddingEventId: eventId,
          type: NotificationType.INVITE,
          locale,
          title: defaults.INVITE.title,
          message: defaults.INVITE.message,
          isAcceptedVariant: false,
        },
        {
          weddingEventId: eventId,
          type: NotificationType.REMINDER,
          locale,
          title: defaults.REMINDER.title,
          message: defaults.REMINDER.message,
          isAcceptedVariant: false,
        },
      ],
    });

    return { success: true };
  } catch (error) {
    console.error("Error initializing templates:", error);
    return { error: "Failed to initialize templates" };
  }
}

// Get a single template by type for rendering (only INVITE and REMINDER supported)
export async function getTemplateForSending(
  eventId: string,
  type: NotificationType,
  locale: string = "he"
) {
  try {
    // Only support INVITE and REMINDER
    if (type !== NotificationType.INVITE && type !== NotificationType.REMINDER) {
      return { error: "Only INVITE and REMINDER templates are supported" };
    }

    const template = await prisma.messageTemplate.findFirst({
      where: {
        weddingEventId: eventId,
        type,
        locale,
        isActive: true,
      },
    });

    if (!template) {
      // Return default template if no custom template exists
      const defaults = DEFAULT_TEMPLATES[locale as keyof typeof DEFAULT_TEMPLATES] || DEFAULT_TEMPLATES.he;

      return {
        success: true,
        template: {
          title: defaults[type].title,
          message: defaults[type].message,
        },
        isDefault: true,
      };
    }

    return { success: true, template, isDefault: false };
  } catch (error) {
    console.error("Error fetching template for sending:", error);
    return { error: "Failed to fetch template" };
  }
}

// Get available placeholders
export async function getTemplatePlaceholders() {
  return [
    { key: "{{guestName}}", description: "Guest's full name" },
    { key: "{{eventTitle}}", description: "Event title" },
    { key: "{{rsvpLink}}", description: "Personal RSVP link" },
    { key: "{{eventDate}}", description: "Event date" },
    { key: "{{eventTime}}", description: "Event time" },
    { key: "{{eventLocation}}", description: "Event location/address" },
    { key: "{{eventVenue}}", description: "Venue name" },
  ];
}

// Update SMS Sender ID for an event
export async function updateSmsSenderId(eventId: string, smsSenderId: string | null) {
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

    // Validate sender ID format (alphanumeric, max 11 chars)
    if (smsSenderId) {
      const trimmed = smsSenderId.trim();
      if (trimmed.length > 11) {
        return { error: "Sender ID must be 11 characters or less" };
      }
      if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
        return { error: "Sender ID must be alphanumeric only (no spaces or special characters)" };
      }
    }

    const updatedEvent = await prisma.weddingEvent.update({
      where: { id: eventId },
      data: { smsSenderId: smsSenderId?.trim() || null },
    });

    revalidatePath(`/dashboard/events/${eventId}/messages`);

    return { success: true, smsSenderId: updatedEvent.smsSenderId };
  } catch (error) {
    console.error("Error updating SMS Sender ID:", error);
    return { error: "Failed to update SMS Sender ID" };
  }
}

// Get guest counts for bulk send eligibility
export async function getBulkSendStats(eventId: string, messageType: NotificationType) {
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

    // Total guests
    const totalGuests = await prisma.guest.count({
      where: { weddingEventId: eventId },
    });

    // Guests with phone numbers
    const guestsWithPhone = await prisma.guest.count({
      where: {
        weddingEventId: eventId,
        phoneNumber: { not: null },
      },
    });

    // Eligible for invites (not already sent)
    let eligibleForInvite = 0;
    if (messageType === NotificationType.INVITE) {
      eligibleForInvite = await prisma.guest.count({
        where: {
          weddingEventId: eventId,
          phoneNumber: { not: null },
          notificationLogs: {
            none: {
              type: NotificationType.INVITE,
              status: "SENT",
            },
          },
        },
      });
    }

    // Eligible for reminders (pending RSVPs)
    let eligibleForReminder = 0;
    if (messageType === NotificationType.REMINDER) {
      eligibleForReminder = await prisma.guest.count({
        where: {
          weddingEventId: eventId,
          phoneNumber: { not: null },
          OR: [
            { rsvp: null },
            { rsvp: { status: "PENDING" } },
          ],
        },
      });
    }

    return {
      success: true,
      totalGuests,
      guestsWithPhone,
      eligibleCount: messageType === NotificationType.INVITE ? eligibleForInvite : eligibleForReminder,
    };
  } catch (error) {
    console.error("Error getting bulk send stats:", error);
    return { error: "Failed to get bulk send stats" };
  }
}
