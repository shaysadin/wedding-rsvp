"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canAccessEvent } from "@/lib/permissions";
import type { SmsTemplateType, SmsTemplateStyle } from "@/config/sms-template-presets";
import { getSmsTemplatePreset } from "@/config/sms-template-presets";

/**
 * Get all SMS templates for an event
 */
export async function getEventSmsTemplates(eventId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized", templates: [] };
    }

    // Check if user can access this event
    const hasAccess = await canAccessEvent(eventId, user.id);
    if (!hasAccess) {
      return { success: false, error: "Unauthorized", templates: [] };
    }

    const templates = await prisma.eventSmsTemplate.findMany({
      where: {
        weddingEventId: eventId,
        isActive: true,
      },
      orderBy: [
        { type: "asc" },
        { sortOrder: "asc" },
      ],
    });

    return {
      success: true,
      templates,
    };
  } catch (error) {
    console.error("Error fetching SMS templates:", error);
    return { success: false, error: "Failed to fetch templates", templates: [] };
  }
}

/**
 * Get SMS templates by type
 */
export async function getEventSmsTemplatesByType(
  eventId: string,
  type: SmsTemplateType
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized", templates: [] };
    }

    // Check if user can access this event
    const hasAccess = await canAccessEvent(eventId, user.id);
    if (!hasAccess) {
      return { success: false, error: "Unauthorized", templates: [] };
    }

    const templates = await prisma.eventSmsTemplate.findMany({
      where: {
        weddingEventId: eventId,
        type,
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return {
      success: true,
      templates,
    };
  } catch (error) {
    console.error("Error fetching SMS templates by type:", error);
    return { success: false, error: "Failed to fetch templates", templates: [] };
  }
}

/**
 * Create SMS template for an event
 */
export async function createEventSmsTemplate(data: {
  eventId: string;
  type: SmsTemplateType;
  style: SmsTemplateStyle;
  nameHe: string;
  nameEn: string;
  messageBodyHe: string;
  messageBodyEn?: string;
  variables?: Record<string, string>;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user can access this event (need EDITOR role)
    const hasAccess = await canAccessEvent(data.eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if template already exists for this type/style
    const existing = await prisma.eventSmsTemplate.findFirst({
      where: {
        weddingEventId: data.eventId,
        type: data.type,
        style: data.style,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Template already exists for ${data.type} - ${data.style}`,
      };
    }

    const template = await prisma.eventSmsTemplate.create({
      data: {
        weddingEventId: data.eventId,
        type: data.type,
        style: data.style,
        nameHe: data.nameHe,
        nameEn: data.nameEn,
        messageBodyHe: data.messageBodyHe,
        messageBodyEn: data.messageBodyEn,
        variables: data.variables || {},
        sortOrder: data.style === "style1" ? 0 : data.style === "style2" ? 1 : 2,
      },
    });

    revalidatePath(`/events/${data.eventId}/messages`);

    return { success: true, template };
  } catch (error) {
    console.error("Error creating SMS template:", error);
    return { success: false, error: "Failed to create template" };
  }
}

/**
 * Create SMS template from preset
 */
export async function createSmsTemplateFromPreset(
  eventId: string,
  type: SmsTemplateType,
  style: SmsTemplateStyle
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user can access this event (need EDITOR role)
    const hasAccess = await canAccessEvent(eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { success: false, error: "Unauthorized" };
    }

    const preset = getSmsTemplatePreset(type, style);
    if (!preset) {
      return { success: false, error: "Preset not found" };
    }

    // Check if template already exists
    const existing = await prisma.eventSmsTemplate.findFirst({
      where: {
        weddingEventId: eventId,
        type,
        style,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Template already exists for ${type} - ${style}`,
      };
    }

    const template = await prisma.eventSmsTemplate.create({
      data: {
        weddingEventId: eventId,
        type: preset.type,
        style: preset.style,
        nameHe: preset.nameHe,
        nameEn: preset.nameEn,
        messageBodyHe: preset.messageBodyHe,
        messageBodyEn: preset.messageBodyEn,
        variables: preset.variables,
        isDefault: true,
        sortOrder: style === "style1" ? 0 : style === "style2" ? 1 : 2,
      },
    });

    revalidatePath(`/events/${eventId}/messages`);

    return { success: true, template };
  } catch (error) {
    console.error("Error creating template from preset:", error);
    return { success: false, error: "Failed to create template from preset" };
  }
}

/**
 * Update SMS template
 */
export async function updateEventSmsTemplate(data: {
  id: string;
  eventId: string;
  nameHe?: string;
  nameEn?: string;
  messageBodyHe?: string;
  messageBodyEn?: string;
  variables?: Record<string, string>;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user can access this event (need EDITOR role)
    const hasAccess = await canAccessEvent(data.eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { success: false, error: "Unauthorized" };
    }

    const template = await prisma.eventSmsTemplate.update({
      where: { id: data.id },
      data: {
        nameHe: data.nameHe,
        nameEn: data.nameEn,
        messageBodyHe: data.messageBodyHe,
        messageBodyEn: data.messageBodyEn,
        variables: data.variables,
      },
    });

    revalidatePath(`/events/${data.eventId}/messages`);

    return { success: true, template };
  } catch (error) {
    console.error("Error updating SMS template:", error);
    return { success: false, error: "Failed to update template" };
  }
}

/**
 * Delete SMS template
 */
export async function deleteEventSmsTemplate(id: string, eventId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user can access this event (need EDITOR role)
    const hasAccess = await canAccessEvent(eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.eventSmsTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath(`/events/${eventId}/messages`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting SMS template:", error);
    return { success: false, error: "Failed to delete template" };
  }
}

/**
 * Initialize default SMS templates for an event
 * Creates all 12 default templates (4 types × 3 styles)
 */
export async function initializeDefaultSmsTemplates(eventId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user can access this event (need EDITOR role)
    const hasAccess = await canAccessEvent(eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { success: false, error: "Unauthorized" };
    }

    const types: SmsTemplateType[] = ["INVITE", "REMINDER", "EVENT_DAY", "THANK_YOU"];
    const styles: SmsTemplateStyle[] = ["style1", "style2", "style3"];

    const createdTemplates: any[] = [];

    for (const type of types) {
      for (const style of styles) {
        // Check if already exists
        const existing = await prisma.eventSmsTemplate.findFirst({
          where: {
            weddingEventId: eventId,
            type,
            style,
          },
        });

        if (!existing) {
          const preset = getSmsTemplatePreset(type, style);
          if (preset) {
            const template = await prisma.eventSmsTemplate.create({
              data: {
                weddingEventId: eventId,
                type: preset.type,
                style: preset.style,
                nameHe: preset.nameHe,
                nameEn: preset.nameEn,
                messageBodyHe: preset.messageBodyHe,
                messageBodyEn: preset.messageBodyEn,
                variables: preset.variables,
                isDefault: true,
                sortOrder: style === "style1" ? 0 : style === "style2" ? 1 : 2,
              },
            });
            createdTemplates.push(template);
          }
        }
      }
    }

    revalidatePath(`/events/${eventId}/messages`);

    return {
      success: true,
      message: `Created ${createdTemplates.length} default templates`,
      templates: createdTemplates,
    };
  } catch (error) {
    console.error("Error initializing default templates:", error);
    return { success: false, error: "Failed to initialize templates" };
  }
}
