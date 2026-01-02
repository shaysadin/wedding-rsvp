"use server";

import { revalidatePath } from "next/cache";
import { UserRole, EventType, InvitationFieldType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
// PDF generation is available but requires installing pdf-lib dependencies
// import { generateInvitation, previewInvitation } from "@/lib/pdf/invitation-generator";
import { FieldPosition, FieldValue } from "@/lib/pdf/types";
import { uploadToR2, getSignedR2Url } from "@/lib/r2";

// ============================================
// PUBLIC - Get Templates for Users
// ============================================

/**
 * Get all active invitation templates
 */
export async function getInvitationTemplates(eventType?: EventType) {
  try {
    const templates = await prisma.invitationTemplate.findMany({
      where: {
        isActive: true,
        ...(eventType ? { eventType } : {}),
      },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return { success: true, templates };
  } catch (error) {
    console.error("Error fetching invitation templates:", error);
    return { error: "Failed to fetch templates" };
  }
}

/**
 * Get a single template by ID
 */
export async function getInvitationTemplate(templateId: string) {
  try {
    const template = await prisma.invitationTemplate.findUnique({
      where: { id: templateId },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!template) {
      return { error: "Template not found" };
    }

    return { success: true, template };
  } catch (error) {
    console.error("Error fetching invitation template:", error);
    return { error: "Failed to fetch template" };
  }
}

// ============================================
// USER - Generate Invitations
// ============================================

/**
 * Generate a PDF invitation
 * Note: Requires pdf-lib to be installed: npm install pdf-lib @pdf-lib/fontkit
 */
export async function generatePdfInvitation(
  eventId: string,
  templateId: string,
  fieldValues: { fieldType: InvitationFieldType; value: string }[]
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Get the template
    const template = await prisma.invitationTemplate.findUnique({
      where: { id: templateId },
      include: {
        fields: true,
      },
    });

    if (!template) {
      return { error: "Template not found" };
    }

    // TODO: Enable when pdf-lib is installed
    // Convert template fields to FieldPosition format
    // const fields: FieldPosition[] = template.fields.map((f) => ({...}));
    // const result = await generateInvitation({...});

    // For now, store the template URL as the PDF URL (placeholder)
    // In production, this would generate a personalized PDF
    const fileName = `invitations/${eventId}/${Date.now()}.json`;

    // Upload field values as JSON for now
    await uploadToR2(
      fileName,
      JSON.stringify({ templateId, fieldValues }),
      "application/json"
    );

    // Get a signed URL for the template PDF
    const pdfUrl = template.pdfUrl;

    // Save to database
    const generated = await prisma.generatedInvitation.create({
      data: {
        weddingEventId: eventId,
        templateId,
        pdfUrl: pdfUrl,
        fieldValues: fieldValues,
      },
    });

    revalidatePath(`/dashboard/events/${eventId}/pdf-invitations`);

    return { success: true, invitation: generated, pdfUrl };
  } catch (error) {
    console.error("Error generating PDF invitation:", error);
    return { error: "Failed to generate invitation" };
  }
}

/**
 * Get user's generated invitations for an event
 */
export async function getGeneratedInvitations(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const invitations = await prisma.generatedInvitation.findMany({
      where: { weddingEventId: eventId },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            nameHe: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, invitations };
  } catch (error) {
    console.error("Error fetching generated invitations:", error);
    return { error: "Failed to fetch invitations" };
  }
}

/**
 * Delete a generated invitation
 */
export async function deleteGeneratedInvitation(invitationId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through event
    const invitation = await prisma.generatedInvitation.findUnique({
      where: { id: invitationId },
      include: {
        weddingEvent: true,
      },
    });

    if (!invitation || invitation.weddingEvent.ownerId !== user.id) {
      return { error: "Invitation not found" };
    }

    const eventId = invitation.weddingEventId;

    // Delete from database
    await prisma.generatedInvitation.delete({
      where: { id: invitationId },
    });

    revalidatePath(`/dashboard/events/${eventId}/pdf-invitations`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting generated invitation:", error);
    return { error: "Failed to delete invitation" };
  }
}

// ============================================
// ADMIN - Manage Templates
// ============================================

/**
 * Create a new invitation template (admin only)
 */
export async function createInvitationTemplate(data: {
  name: string;
  nameHe: string;
  description?: string;
  descriptionHe?: string;
  eventType: EventType;
  pdfUrl: string;
  thumbnailUrl?: string;
}) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized" };
    }

    const template = await prisma.invitationTemplate.create({
      data: {
        name: data.name,
        nameHe: data.nameHe,
        description: data.description,
        descriptionHe: data.descriptionHe,
        eventType: data.eventType,
        pdfUrl: data.pdfUrl,
        thumbnailUrl: data.thumbnailUrl,
      },
    });

    revalidatePath("/admin/invitation-templates");

    return { success: true, template };
  } catch (error) {
    console.error("Error creating invitation template:", error);
    return { error: "Failed to create template" };
  }
}

/**
 * Update an invitation template (admin only)
 */
export async function updateInvitationTemplate(
  templateId: string,
  data: {
    name?: string;
    nameHe?: string;
    description?: string;
    descriptionHe?: string;
    eventType?: EventType;
    pdfUrl?: string;
    thumbnailUrl?: string;
    isActive?: boolean;
    sortOrder?: number;
  }
) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized" };
    }

    const template = await prisma.invitationTemplate.update({
      where: { id: templateId },
      data,
    });

    revalidatePath("/admin/invitation-templates");
    revalidatePath(`/admin/invitation-templates/${templateId}`);

    return { success: true, template };
  } catch (error) {
    console.error("Error updating invitation template:", error);
    return { error: "Failed to update template" };
  }
}

/**
 * Delete an invitation template (admin only)
 */
export async function deleteInvitationTemplate(templateId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized" };
    }

    await prisma.invitationTemplate.delete({
      where: { id: templateId },
    });

    revalidatePath("/admin/invitation-templates");

    return { success: true };
  } catch (error) {
    console.error("Error deleting invitation template:", error);
    return { error: "Failed to delete template" };
  }
}

/**
 * Add a field to a template (admin only)
 */
export async function addTemplateField(
  templateId: string,
  data: {
    fieldType: InvitationFieldType;
    label: string;
    labelHe?: string;
    positionX: number;
    positionY: number;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    textColor?: string;
    textAlign?: string;
    maxWidth?: number;
    isRequired?: boolean;
    defaultValue?: string;
  }
) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized" };
    }

    // Get max sort order
    const maxSortOrder = await prisma.invitationTemplateField.aggregate({
      where: { templateId },
      _max: { sortOrder: true },
    });

    const field = await prisma.invitationTemplateField.create({
      data: {
        templateId,
        fieldType: data.fieldType,
        label: data.label,
        labelHe: data.labelHe,
        positionX: data.positionX,
        positionY: data.positionY,
        fontSize: data.fontSize ?? 16,
        fontFamily: data.fontFamily ?? "Heebo",
        fontWeight: data.fontWeight ?? "normal",
        textColor: data.textColor ?? "#000000",
        textAlign: data.textAlign ?? "center",
        maxWidth: data.maxWidth,
        isRequired: data.isRequired ?? true,
        defaultValue: data.defaultValue,
        sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
      },
    });

    revalidatePath(`/admin/invitation-templates/${templateId}`);

    return { success: true, field };
  } catch (error) {
    console.error("Error adding template field:", error);
    return { error: "Failed to add field" };
  }
}

/**
 * Update a template field (admin only)
 */
export async function updateTemplateField(
  fieldId: string,
  data: {
    positionX?: number;
    positionY?: number;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    textColor?: string;
    textAlign?: string;
    maxWidth?: number;
    isRequired?: boolean;
    defaultValue?: string;
  }
) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized" };
    }

    const field = await prisma.invitationTemplateField.update({
      where: { id: fieldId },
      data,
    });

    revalidatePath(`/admin/invitation-templates/${field.templateId}`);

    return { success: true, field };
  } catch (error) {
    console.error("Error updating template field:", error);
    return { error: "Failed to update field" };
  }
}

/**
 * Delete a template field (admin only)
 */
export async function deleteTemplateField(fieldId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized" };
    }

    const field = await prisma.invitationTemplateField.delete({
      where: { id: fieldId },
    });

    revalidatePath(`/admin/invitation-templates/${field.templateId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting template field:", error);
    return { error: "Failed to delete field" };
  }
}

/**
 * Get all templates for admin management
 */
export async function getAdminInvitationTemplates() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized" };
    }

    const templates = await prisma.invitationTemplate.findMany({
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { generations: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return { success: true, templates };
  } catch (error) {
    console.error("Error fetching admin invitation templates:", error);
    return { error: "Failed to fetch templates" };
  }
}
