"use server";

import { revalidatePath } from "next/cache";
import { UserRole, BackgroundType, CardStyle, DateDisplayStyle, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export interface RsvpPageSettingsInput {
  eventId: string;
  // Mode
  advancedMode?: boolean | null;
  // Background
  backgroundType?: BackgroundType | null;
  backgroundColor?: string | null;
  backgroundImage?: string | null;
  backgroundOverlay?: number | null;
  backgroundBlur?: number | null;
  // Colors (Simple)
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  // Card (Simple)
  cardStyle?: CardStyle | null;
  cardOpacity?: number | null;
  cardBlur?: number | null;
  // Typography (Simple)
  fontFamily?: string | null;
  // Date Display (Simple)
  dateDisplayStyle?: DateDisplayStyle | null;
  showCountdown?: boolean | null;
  // Visibility (Simple)
  showGoogleMaps?: boolean | null;
  showWaze?: boolean | null;
  // URLs
  googleMapsUrl?: string | null;
  wazeUrl?: string | null;
  // Content
  welcomeTitle?: string | null;
  welcomeMessage?: string | null;
  thankYouMessage?: string | null;
  declineMessage?: string | null;
  // Locale
  pageLocale?: string | null;
  // ============ ADVANCED MODE FIELDS ============
  // Card (Advanced)
  cardBackground?: string | null;
  cardBorderRadius?: number | null;
  cardPadding?: number | null;
  cardMaxWidth?: number | null;
  textColor?: string | null;
  // Button (Advanced)
  buttonStyle?: string | null;
  buttonColor?: string | null;
  buttonTextColor?: string | null;
  buttonBorderRadius?: number | null;
  buttonBorderColor?: string | null;
  buttonShadow?: boolean | null;
  buttonSize?: string | null;
  // Input (Advanced)
  inputBackgroundColor?: string | null;
  inputTextColor?: string | null;
  inputBorderColor?: string | null;
  // Text Colors (Advanced)
  subtitleTextColor?: string | null;
  labelTextColor?: string | null;
  // Guest Counter (Advanced)
  guestCounterBackground?: string | null;
  guestCounterTextColor?: string | null;
  guestCounterAccent?: string | null;
  // Font Sizes (Advanced)
  titleFontSize?: number | null;
  subtitleFontSize?: number | null;
  labelFontSize?: number | null;
  buttonFontSize?: number | null;
  // Date Card (Advanced)
  dateCardBackground?: string | null;
  dateCardTextColor?: string | null;
  dateCardAccentColor?: string | null;
  dateCardBorderRadius?: number | null;
  dateCardBackgroundImage?: string | null;
  dateCardOverlay?: number | null;
  dateCardBlur?: number | null;
  dateCardPadding?: number | null;
  dateCardShadow?: boolean | null;
  dateDayFontSize?: number | null;
  dateMonthFontSize?: number | null;
  dateYearFontSize?: number | null;
  // Time Section (Advanced)
  showTimeSection?: boolean | null;
  timeSectionBackground?: string | null;
  timeSectionTextColor?: string | null;
  timeSectionBorderRadius?: number | null;
  timeFontSize?: number | null;
  // Address Section (Advanced)
  showAddressSection?: boolean | null;
  addressSectionBackground?: string | null;
  addressSectionTextColor?: string | null;
  addressSectionBorderRadius?: number | null;
  addressFontSize?: number | null;
  // Countdown Section (Advanced)
  countdownSectionBackground?: string | null;
  countdownSectionTextColor?: string | null;
  countdownSectionBorderRadius?: number | null;
  countdownBoxBackground?: string | null;
  countdownBoxTextColor?: string | null;
  countdownLabelColor?: string | null;
  countdownNumberFontSize?: number | null;
  // Question Section (Advanced)
  questionSectionBackground?: string | null;
  questionSectionBorderRadius?: number | null;
  questionTextColor?: string | null;
  questionFontSize?: number | null;
  acceptButtonColor?: string | null;
  acceptButtonTextColor?: string | null;
  declineButtonColor?: string | null;
  declineButtonTextColor?: string | null;
  // Font Weights
  titleFontWeight?: number | null;
  subtitleFontWeight?: number | null;
  labelFontWeight?: number | null;
  buttonTextFontWeight?: number | null;
  dateDayFontWeight?: number | null;
  dateMonthFontWeight?: number | null;
  dateDayOfWeekFontWeight?: number | null;
  countdownNumberFontWeight?: number | null;
  countdownLabelFontWeight?: number | null;
  timeFontWeight?: number | null;
  addressFontWeight?: number | null;
  // Navigation Button Styling
  navButtonFontSize?: number | null;
  navButtonFontWeight?: number | null;
  navButtonBackground?: string | null;
  navButtonTextColor?: string | null;
  navButtonBorderColor?: string | null;
  navButtonBorderRadius?: number | null;
  navButtonBorderWidth?: number | null;
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

    // Fields that should never be updated directly
    const excludedFields = ['id', 'weddingEventId', 'createdAt', 'updatedAt'];

    // Convert null values to undefined and filter out excluded fields for Prisma compatibility
    const cleanedData = Object.fromEntries(
      Object.entries(settingsData).filter(
        ([key, v]) => v !== null && !excludedFields.includes(key)
      )
    ) as Prisma.RsvpPageSettingsUpdateInput;

    let settings;
    if (event.rsvpPageSettings) {
      settings = await prisma.rsvpPageSettings.update({
        where: { id: event.rsvpPageSettings.id },
        data: cleanedData,
      });
    } else {
      settings = await prisma.rsvpPageSettings.create({
        data: {
          weddingEventId: eventId,
          ...cleanedData,
        } as Prisma.RsvpPageSettingsCreateInput,
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

    if (!user || (user.role !== UserRole.ROLE_WEDDING_OWNER && user.role !== UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership (platform owners can access any event)
    const event = await prisma.weddingEvent.findFirst({
      where: user.role === UserRole.ROLE_PLATFORM_OWNER
        ? { id: eventId }
        : { id: eventId, ownerId: user.id },
      include: { rsvpPageSettings: true },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Convert Decimal to number for client component serialization
    const serializedEvent = {
      ...event,
      totalBudget: event.totalBudget ? Number(event.totalBudget) : null,
    };

    return { success: true, settings: event.rsvpPageSettings, event: serializedEvent };
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
  // Mode
  advancedMode?: boolean;
  // Background
  backgroundType?: BackgroundType;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOverlay?: number;
  backgroundBlur?: number;
  // Colors (Simple)
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  // Card (Simple)
  cardStyle?: CardStyle;
  cardOpacity?: number;
  cardBlur?: number;
  // Typography (Simple)
  fontFamily?: string;
  // Date Display (Simple)
  dateDisplayStyle?: DateDisplayStyle;
  showCountdown?: boolean;
  // Visibility (Simple)
  showGoogleMaps?: boolean;
  showWaze?: boolean;
  // Content
  welcomeTitle?: string;
  welcomeMessage?: string;
  thankYouMessage?: string;
  declineMessage?: string;
  // Locale
  pageLocale?: string;
  // Advanced Fields
  cardBackground?: string;
  cardBorderRadius?: number;
  cardPadding?: number;
  cardMaxWidth?: number;
  textColor?: string;
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
  templateDescription?: string,
  isGlobal: boolean = false
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

    // Extract settings (exclude id, weddingEventId, timestamps, and fields not in template model)
    const {
      id: _id,
      weddingEventId: _eventId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      // These fields exist in RsvpPageSettings but NOT in RsvpTemplate
      googleMapsUrl: _googleMapsUrl,
      wazeUrl: _wazeUrl,
      ...settingsData
    } = event.rsvpPageSettings;

    // Create template from settings
    const template = await prisma.rsvpTemplate.create({
      data: {
        name: templateName,
        description: templateDescription,
        ownerId: isGlobal ? null : user.id,
        isSystem: isGlobal,
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
