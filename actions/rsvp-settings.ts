"use server";

import { revalidatePath } from "next/cache";
import { UserRole, BackgroundType, CardStyle } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export interface RsvpPageSettingsInput {
  eventId: string;
  // Background
  backgroundType?: BackgroundType;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOverlay?: number;
  backgroundBlur?: number;
  // Colors
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  accentColor?: string;
  // Typography
  fontFamily?: string;
  titleFontFamily?: string;
  fontSize?: string;
  // Card
  cardStyle?: CardStyle;
  cardBackground?: string;
  cardBorderRadius?: number;
  cardPadding?: number;
  cardMaxWidth?: number;
  cardOpacity?: number;
  // Layout
  contentAlignment?: string;
  showEventDetails?: boolean;
  showGoogleMaps?: boolean;
  showCalendar?: boolean;
  // Content
  welcomeTitle?: string;
  welcomeMessage?: string;
  thankYouMessage?: string;
  declineMessage?: string;
  // Images
  logoUrl?: string;
  coupleImageUrl?: string;
  // Button
  buttonStyle?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonBorderRadius?: number;
}

export async function updateRsvpPageSettings(input: RsvpPageSettingsInput) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    const { eventId, ...settingsData } = input;

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      include: { rsvpPageSettings: true },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    let settings;
    if (event.rsvpPageSettings) {
      settings = await prisma.rsvpPageSettings.update({
        where: { id: event.rsvpPageSettings.id },
        data: settingsData,
      });
    } else {
      settings = await prisma.rsvpPageSettings.create({
        data: {
          weddingEventId: eventId,
          ...settingsData,
        },
      });
    }

    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath(`/dashboard/events/${eventId}/customize`);

    return { success: true, settings };
  } catch (error) {
    console.error("Error updating RSVP page settings:", error);
    return { error: "Failed to update settings" };
  }
}

export async function getRsvpPageSettings(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      include: { rsvpPageSettings: true },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    return { success: true, settings: event.rsvpPageSettings, event };
  } catch (error) {
    console.error("Error fetching RSVP page settings:", error);
    return { error: "Failed to fetch settings" };
  }
}

// ============ TEMPLATE MANAGEMENT ============

export interface RsvpTemplateInput {
  name: string;
  description?: string;
  previewUrl?: string;
  // Background
  backgroundType?: BackgroundType;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOverlay?: number;
  backgroundBlur?: number;
  // Colors
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  accentColor?: string;
  // Typography
  fontFamily?: string;
  titleFontFamily?: string;
  fontSize?: string;
  // Card
  cardStyle?: CardStyle;
  cardBackground?: string;
  cardBorderRadius?: number;
  cardPadding?: number;
  cardMaxWidth?: number;
  cardOpacity?: number;
  // Layout
  contentAlignment?: string;
  showEventDetails?: boolean;
  showGoogleMaps?: boolean;
  showCalendar?: boolean;
  // Content
  welcomeTitle?: string;
  welcomeMessage?: string;
  thankYouMessage?: string;
  declineMessage?: string;
  // Button
  buttonStyle?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonBorderRadius?: number;
}

export async function createRsvpTemplate(input: RsvpTemplateInput) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const template = await prisma.rsvpTemplate.create({
      data: {
        ...input,
        ownerId: user.id,
        isSystem: false,
      },
    });

    revalidatePath("/dashboard/templates");

    return { success: true, template };
  } catch (error) {
    console.error("Error creating RSVP template:", error);
    return { error: "Failed to create template" };
  }
}

export async function updateRsvpTemplate(
  templateId: string,
  input: Partial<RsvpTemplateInput>
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify template ownership (unless it's a system template being updated by platform owner)
    const existingTemplate = await prisma.rsvpTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { ownerId: user.id },
          {
            isSystem: true,
            ...(user.role === UserRole.ROLE_PLATFORM_OWNER ? {} : { id: "never" }),
          },
        ],
      },
    });

    if (!existingTemplate) {
      return { error: "Template not found" };
    }

    const template = await prisma.rsvpTemplate.update({
      where: { id: templateId },
      data: input,
    });

    revalidatePath("/dashboard/templates");

    return { success: true, template };
  } catch (error) {
    console.error("Error updating RSVP template:", error);
    return { error: "Failed to update template" };
  }
}

export async function deleteRsvpTemplate(templateId: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify template ownership
    const existingTemplate = await prisma.rsvpTemplate.findFirst({
      where: {
        id: templateId,
        ownerId: user.id,
        isSystem: false, // Can't delete system templates
      },
    });

    if (!existingTemplate) {
      return { error: "Template not found or cannot be deleted" };
    }

    await prisma.rsvpTemplate.delete({
      where: { id: templateId },
    });

    revalidatePath("/dashboard/templates");

    return { success: true };
  } catch (error) {
    console.error("Error deleting RSVP template:", error);
    return { error: "Failed to delete template" };
  }
}

export async function getTemplates() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Get both system templates and user's own templates
    const templates = await prisma.rsvpTemplate.findMany({
      where: {
        OR: [{ isSystem: true }, { ownerId: user.id }],
      },
      orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
    });

    return { success: true, templates };
  } catch (error) {
    console.error("Error fetching templates:", error);
    return { error: "Failed to fetch templates" };
  }
}

export async function getTemplateById(templateId: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const template = await prisma.rsvpTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ isSystem: true }, { ownerId: user.id }],
      },
    });

    if (!template) {
      return { error: "Template not found" };
    }

    return { success: true, template };
  } catch (error) {
    console.error("Error fetching template:", error);
    return { error: "Failed to fetch template" };
  }
}

export async function applyTemplateToEvent(eventId: string, templateId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      include: { rsvpPageSettings: true },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Get template
    const template = await prisma.rsvpTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ isSystem: true }, { ownerId: user.id }],
      },
    });

    if (!template) {
      return { error: "Template not found" };
    }

    // Extract template fields (exclude id, name, description, etc.)
    const {
      id: _id,
      name: _name,
      description: _description,
      previewUrl: _previewUrl,
      isSystem: _isSystem,
      ownerId: _ownerId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...templateSettings
    } = template;

    // Apply template to event settings
    let settings;
    if (event.rsvpPageSettings) {
      settings = await prisma.rsvpPageSettings.update({
        where: { id: event.rsvpPageSettings.id },
        data: templateSettings,
      });
    } else {
      settings = await prisma.rsvpPageSettings.create({
        data: {
          weddingEventId: eventId,
          ...templateSettings,
        },
      });
    }

    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath(`/dashboard/events/${eventId}/customize`);

    return { success: true, settings };
  } catch (error) {
    console.error("Error applying template:", error);
    return { error: "Failed to apply template" };
  }
}

export async function saveSettingsAsTemplate(
  eventId: string,
  templateName: string,
  templateDescription?: string
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Get event settings
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      include: { rsvpPageSettings: true },
    });

    if (!event || !event.rsvpPageSettings) {
      return { error: "Event settings not found" };
    }

    // Extract settings (exclude id, weddingEventId, timestamps)
    const {
      id: _id,
      weddingEventId: _eventId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...settingsData
    } = event.rsvpPageSettings;

    // Create template from settings
    const template = await prisma.rsvpTemplate.create({
      data: {
        name: templateName,
        description: templateDescription,
        ownerId: user.id,
        isSystem: false,
        ...settingsData,
      },
    });

    revalidatePath("/dashboard/templates");

    return { success: true, template };
  } catch (error) {
    console.error("Error saving settings as template:", error);
    return { error: "Failed to save template" };
  }
}
