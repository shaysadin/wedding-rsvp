"use server";

import { revalidatePath } from "next/cache";
import { EventType, InvitationFieldType, UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser, requirePlatformOwner } from "@/lib/session";

/**
 * Helper to check if user is admin (platform owner or admin role)
 */
async function isAdminUser(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user?.id) return false;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { roles: true },
  });

  return dbUser?.roles?.some(
    (role) => role === UserRole.ROLE_PLATFORM_OWNER
  ) ?? false;
}

// ============================================
// ADMIN ACTIONS (Platform Owner Only)
// ============================================

/**
 * Get all invitation templates (admin view)
 */
export async function getAdminInvitationTemplates() {
  try {
    if (!(await isAdminUser())) {
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
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return { templates };
  } catch (error) {
    console.error("Error fetching templates:", error);
    return { error: "Failed to fetch templates" };
  }
}

/**
 * Create a new invitation template
 */
export async function createInvitationTemplate(input: {
  name: string;
  nameHe: string;
  description?: string;
  descriptionHe?: string;
  eventType: EventType;
  imageUrl: string;
  thumbnailUrl?: string;
  pdfUrl?: string;
  fields: Array<{
    fieldType: InvitationFieldType;
    label: string;
    labelHe?: string;
    placeholder?: string;
    isRequired?: boolean;
    originalValue: string;
    sortOrder?: number;
  }>;
}) {
  try {
    if (!(await isAdminUser())) {
      return { error: "Unauthorized" };
    }

    const template = await prisma.invitationTemplate.create({
      data: {
        name: input.name,
        nameHe: input.nameHe,
        description: input.description,
        descriptionHe: input.descriptionHe,
        eventType: input.eventType,
        imageUrl: input.imageUrl,
        thumbnailUrl: input.thumbnailUrl,
        pdfUrl: input.pdfUrl,
        fields: {
          create: input.fields.map((field, index) => ({
            fieldType: field.fieldType,
            label: field.label,
            labelHe: field.labelHe,
            placeholder: field.placeholder,
            isRequired: field.isRequired ?? true,
            originalValue: field.originalValue,
            sortOrder: field.sortOrder ?? index,
          })),
        },
      },
      include: {
        fields: true,
      },
    });

    revalidatePath("/[locale]/admin/invitation-templates");
    return { success: true, template };
  } catch (error) {
    console.error("Error creating template:", error);
    return { error: "Failed to create template" };
  }
}

/**
 * Update an invitation template
 */
export async function updateInvitationTemplate(
  templateId: string,
  input: {
    name?: string;
    nameHe?: string;
    description?: string;
    descriptionHe?: string;
    eventType?: EventType;
    imageUrl?: string;
    thumbnailUrl?: string;
    isActive?: boolean;
    sortOrder?: number;
  }
) {
  try {
    if (!(await isAdminUser())) {
      return { error: "Unauthorized" };
    }

    const template = await prisma.invitationTemplate.update({
      where: { id: templateId },
      data: input,
    });

    revalidatePath("/[locale]/admin/invitation-templates");
    return { success: true, template };
  } catch (error) {
    console.error("Error updating template:", error);
    return { error: "Failed to update template" };
  }
}

/**
 * Delete an invitation template
 */
export async function deleteInvitationTemplate(templateId: string) {
  try {
    if (!(await isAdminUser())) {
      return { error: "Unauthorized" };
    }

    await prisma.invitationTemplate.delete({
      where: { id: templateId },
    });

    revalidatePath("/[locale]/admin/invitation-templates");
    return { success: true };
  } catch (error) {
    console.error("Error deleting template:", error);
    return { error: "Failed to delete template" };
  }
}

/**
 * Add a field to a template
 */
export async function addTemplateField(
  templateId: string,
  field: {
    fieldType: InvitationFieldType;
    label: string;
    labelHe?: string;
    placeholder?: string;
    isRequired?: boolean;
    originalValue: string;
    sortOrder?: number;
  }
) {
  try {
    if (!(await isAdminUser())) {
      return { error: "Unauthorized" };
    }

    const newField = await prisma.invitationTemplateField.create({
      data: {
        templateId,
        fieldType: field.fieldType,
        label: field.label,
        labelHe: field.labelHe,
        placeholder: field.placeholder,
        isRequired: field.isRequired ?? true,
        originalValue: field.originalValue,
        sortOrder: field.sortOrder ?? 0,
      },
    });

    revalidatePath("/[locale]/admin/invitation-templates");
    return { success: true, field: newField };
  } catch (error) {
    console.error("Error adding field:", error);
    return { error: "Failed to add field" };
  }
}

/**
 * Update a template field
 */
export async function updateTemplateField(
  fieldId: string,
  input: {
    fieldType?: InvitationFieldType;
    label?: string;
    labelHe?: string;
    placeholder?: string;
    isRequired?: boolean;
    originalValue?: string;
    sortOrder?: number;
  }
) {
  try {
    if (!(await isAdminUser())) {
      return { error: "Unauthorized" };
    }

    const field = await prisma.invitationTemplateField.update({
      where: { id: fieldId },
      data: input,
    });

    revalidatePath("/[locale]/admin/invitation-templates");
    return { success: true, field };
  } catch (error) {
    console.error("Error updating field:", error);
    return { error: "Failed to update field" };
  }
}

/**
 * Delete a template field
 */
export async function deleteTemplateField(fieldId: string) {
  try {
    if (!(await isAdminUser())) {
      return { error: "Unauthorized" };
    }

    await prisma.invitationTemplateField.delete({
      where: { id: fieldId },
    });

    revalidatePath("/[locale]/admin/invitation-templates");
    return { success: true };
  } catch (error) {
    console.error("Error deleting field:", error);
    return { error: "Failed to delete field" };
  }
}

// ============================================
// PUBLIC ACTIONS (Wedding Owners)
// ============================================

/**
 * Get active templates for wedding owners
 */
export async function getActiveTemplates(eventType?: EventType) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const templates = await prisma.invitationTemplate.findMany({
      where: {
        isActive: true,
        ...(eventType && { eventType }),
      },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return { templates };
  } catch (error) {
    console.error("Error fetching templates:", error);
    return { error: "Failed to fetch templates" };
  }
}

/**
 * Get a single template by ID (admin view)
 */
export async function getInvitationTemplate(templateId: string) {
  try {
    if (!(await isAdminUser())) {
      return { error: "Unauthorized" };
    }

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

    return { template };
  } catch (error) {
    console.error("Error fetching template:", error);
    return { error: "Failed to fetch template" };
  }
}

/**
 * Get a single template by ID (for wedding owners)
 */
export async function getTemplateById(templateId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

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

    return { template };
  } catch (error) {
    console.error("Error fetching template:", error);
    return { error: "Failed to fetch template" };
  }
}
