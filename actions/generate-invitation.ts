"use server";

import { revalidatePath } from "next/cache";
import { UserRole, InvitationFieldType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { generateInvitation, validateFieldValues, type FieldValue } from "@/lib/invitations/generator";
import { uploadToR2, getPublicR2Url } from "@/lib/r2";

/**
 * Generate custom invitation for a wedding event
 */
export async function generateCustomInvitation(params: {
  eventId: string;
  templateId: string;
  fieldValues: FieldValue[];
}) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: params.eventId,
        ownerId: user.id,
      },
    });

    if (!event) {
      return { error: "Event not found or unauthorized" };
    }

    // Get template with fields
    const template = await prisma.invitationTemplate.findUnique({
      where: { id: params.templateId },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!template) {
      return { error: "Template not found" };
    }

    if (!template.isActive) {
      return { error: "Template is not active" };
    }

    // Validate field values
    const validation = validateFieldValues(
      {
        ...template,
        fields: template.fields.map((f) => ({
          fieldType: f.fieldType,
          cssClassName: f.cssClassName,
          fontSize: f.fontSize,
          fontFamily: f.fontFamily,
          fontWeight: f.fontWeight,
          textColor: f.textColor,
          textAlign: f.textAlign,
          lineHeight: f.lineHeight,
          letterSpacing: f.letterSpacing,
          top: f.top,
          left: f.left,
          right: f.right,
          bottom: f.bottom,
          width: f.width,
          maxWidth: f.maxWidth,
          defaultValue: f.defaultValue,
        })),
      },
      params.fieldValues
    );

    if (!validation.valid) {
      return {
        error: `Missing required fields: ${validation.missingFields.join(", ")}`,
        missingFields: validation.missingFields,
      };
    }

    // Generate invitation PNG
    const pngBuffer = await generateInvitation({
      template: {
        ...template,
        fields: template.fields.map((f) => ({
          fieldType: f.fieldType,
          cssClassName: f.cssClassName,
          fontSize: f.fontSize,
          fontFamily: f.fontFamily,
          fontWeight: f.fontWeight,
          textColor: f.textColor,
          textAlign: f.textAlign,
          lineHeight: f.lineHeight,
          letterSpacing: f.letterSpacing,
          top: f.top,
          left: f.left,
          right: f.right,
          bottom: f.bottom,
          width: f.width,
          maxWidth: f.maxWidth,
          defaultValue: f.defaultValue,
        })),
      },
      fieldValues: params.fieldValues,
    });

    // Upload generated PNG to R2
    const timestamp = Date.now();
    const pngKey = `generated-invitations/${params.eventId}-${timestamp}.png`;
    await uploadToR2(pngKey, pngBuffer, "image/png");
    const pngUrl = await getPublicR2Url(pngKey);

    // Save generation record
    const generation = await prisma.generatedInvitation.create({
      data: {
        weddingEventId: params.eventId,
        templateId: params.templateId,
        pngUrl,
        fieldValues: params.fieldValues as any, // Prisma Json type
      },
    });

    // Update event with invitation URL
    await prisma.weddingEvent.update({
      where: { id: params.eventId },
      data: {
        invitationImageUrl: pngUrl,
      },
    });

    revalidatePath(`/dashboard/events/${params.eventId}`);
    revalidatePath(`/dashboard/events/${params.eventId}/invitations`);

    return {
      success: true,
      pngUrl,
      generation,
    };
  } catch (error) {
    console.error("Error generating invitation:", error);
    return {
      error: `Failed to generate invitation: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get generated invitations for an event
 */
export async function getEventInvitations(eventId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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
            eventType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      invitations,
    };
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return { error: "Failed to fetch invitations" };
  }
}

/**
 * Preview invitation without saving
 */
export async function previewInvitation(params: {
  templateId: string;
  fieldValues: FieldValue[];
}) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
      return { error: "Unauthorized" };
    }

    // Get template
    const template = await prisma.invitationTemplate.findUnique({
      where: { id: params.templateId },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!template) {
      return { error: "Template not found" };
    }

    // Generate preview PNG
    const pngBuffer = await generateInvitation({
      template: {
        ...template,
        fields: template.fields.map((f) => ({
          fieldType: f.fieldType,
          cssClassName: f.cssClassName,
          fontSize: f.fontSize,
          fontFamily: f.fontFamily,
          fontWeight: f.fontWeight,
          textColor: f.textColor,
          textAlign: f.textAlign,
          lineHeight: f.lineHeight,
          letterSpacing: f.letterSpacing,
          top: f.top,
          left: f.left,
          right: f.right,
          bottom: f.bottom,
          width: f.width,
          maxWidth: f.maxWidth,
          defaultValue: f.defaultValue,
        })),
      },
      fieldValues: params.fieldValues,
    });

    // Convert to base64 for preview
    const base64 = pngBuffer.toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    return {
      success: true,
      previewUrl: dataUrl,
    };
  } catch (error) {
    console.error("Error previewing invitation:", error);
    return {
      error: `Failed to preview invitation: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
