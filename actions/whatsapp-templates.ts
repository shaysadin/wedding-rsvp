"use server";

import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { WhatsAppTemplateType } from "@/config/whatsapp-templates";

/**
 * Get active WhatsApp templates for a specific type
 * Used by the template selector in the send message dialog
 */
export async function getActiveWhatsAppTemplates(type: WhatsAppTemplateType) {
  try {
    const user = await getCurrentUser();

    // Check if user is authenticated
    if (!user) {
      return { success: false, error: "Unauthorized", templates: [] };
    }

    // Map config type to Prisma enum
    const prismaType = type as any; // The enum values match

    const templates = await prisma.whatsAppTemplate.findMany({
      where: {
        type: prismaType,
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      select: {
        id: true,
        style: true,
        contentSid: true,
        nameHe: true,
        nameEn: true,
        templateText: true,
        previewText: true,
        previewTextHe: true,
      },
    });

    return {
      success: true,
      templates,
    };
  } catch (error) {
    console.error("Error fetching WhatsApp templates:", error);
    return { success: false, error: "Failed to fetch templates", templates: [] };
  }
}

/**
 * Get a specific WhatsApp template by type and style
 */
export async function getWhatsAppTemplate(type: WhatsAppTemplateType, style: string) {
  try {
    const prismaType = type as any;

    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        type: prismaType,
        style,
        isActive: true,
      },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    return {
      success: true,
      template,
    };
  } catch (error) {
    console.error("Error fetching WhatsApp template:", error);
    return { success: false, error: "Failed to fetch template" };
  }
}

/**
 * Get WhatsApp template by Content SID
 */
export async function getWhatsAppTemplateByContentSid(contentSid: string) {
  try {
    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        contentSid,
        isActive: true,
      },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    return {
      success: true,
      template,
    };
  } catch (error) {
    console.error("Error fetching WhatsApp template:", error);
    return { success: false, error: "Failed to fetch template" };
  }
}

/**
 * Admin: Create or update a WhatsApp template
 */
export async function upsertWhatsAppTemplate(data: {
  type: WhatsAppTemplateType;
  style: string;
  nameHe: string;
  nameEn: string;
  contentSid: string;
  templateText?: string;
  previewText?: string;
  previewTextHe?: string;
  sortOrder?: number;
}) {
  try {
    const user = await getCurrentUser();

    // Only admins can manage templates
    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    const prismaType = data.type as any;

    const template = await prisma.whatsAppTemplate.upsert({
      where: {
        type_style: {
          type: prismaType,
          style: data.style,
        },
      },
      create: {
        type: prismaType,
        style: data.style,
        nameHe: data.nameHe,
        nameEn: data.nameEn,
        contentSid: data.contentSid,
        templateText: data.templateText,
        previewText: data.previewText,
        previewTextHe: data.previewTextHe,
        sortOrder: data.sortOrder ?? 0,
        isActive: true,
      },
      update: {
        nameHe: data.nameHe,
        nameEn: data.nameEn,
        contentSid: data.contentSid,
        templateText: data.templateText,
        previewText: data.previewText,
        previewTextHe: data.previewTextHe,
        sortOrder: data.sortOrder,
        isActive: true,
      },
    });

    return { success: true, template };
  } catch (error) {
    console.error("Error upserting WhatsApp template:", error);
    return { success: false, error: "Failed to save template" };
  }
}

/**
 * Admin: Delete a WhatsApp template (soft delete by setting isActive to false)
 */
export async function deleteWhatsAppTemplate(id: string) {
  try {
    const user = await getCurrentUser();

    // Only admins can manage templates
    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.whatsAppTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting WhatsApp template:", error);
    return { success: false, error: "Failed to delete template" };
  }
}

/**
 * Admin: Get all WhatsApp templates (including inactive)
 */
export async function getAllWhatsAppTemplates() {
  try {
    const user = await getCurrentUser();

    // Only admins can see all templates
    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized", templates: [] };
    }

    const templates = await prisma.whatsAppTemplate.findMany({
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    });

    return { success: true, templates };
  } catch (error) {
    console.error("Error fetching all WhatsApp templates:", error);
    return { success: false, error: "Failed to fetch templates", templates: [] };
  }
}
