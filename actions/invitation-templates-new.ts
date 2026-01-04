"use server";

import { revalidatePath } from "next/cache";
import { UserRole, TemplateType, EventType, InvitationFieldType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { pdfToPng, getPdfDimensions } from "@/lib/invitations/pdf-to-png";
import { eraseTextRegions, smartEraseTextRegions, type TextRegion } from "@/lib/invitations/image-processor";
import { uploadToR2, getPublicR2Url } from "@/lib/r2";

// Maximum file size (20MB for PDFs)
const MAX_PDF_SIZE = 20 * 1024 * 1024;

/**
 * Upload PDF template and convert to PNG background
 * Step 1: Upload PDF, convert to PNG, return preview
 */
export async function uploadPdfTemplate(base64Pdf: string) {
  try {
    const user = await getCurrentUser();

    // Only platform owner can upload templates
    if (!user || !user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized: Only platform owners can upload templates" };
    }

    // Validate base64
    if (!base64Pdf || !base64Pdf.startsWith("data:application/pdf")) {
      return { error: "Invalid PDF data" };
    }

    // Check size
    if (base64Pdf.length > MAX_PDF_SIZE * 1.4) {
      return { error: "PDF file too large. Maximum size is 10MB." };
    }

    // Extract buffer from base64
    const base64Data = base64Pdf.split(",")[1];
    const pdfBuffer = Buffer.from(base64Data, "base64");

    // Get PDF dimensions
    const dimensions = await getPdfDimensions(pdfBuffer);

    // Convert PDF to PNG
    const pngBuffer = await pdfToPng(pdfBuffer, { scale: 2 });

    // Upload PNG preview to R2
    const timestamp = Date.now();
    const pngKey = `invitation-templates/preview-${timestamp}.png`;
    await uploadToR2(pngKey, pngBuffer, "image/png");
    const previewUrl = await getPublicR2Url(pngKey);

    // Upload original PDF to R2
    const pdfKey = `invitation-templates/original-${timestamp}.pdf`;
    await uploadToR2(pdfKey, pdfBuffer, "application/pdf");
    const pdfUrl = await getPublicR2Url(pdfKey);

    return {
      success: true,
      previewUrl,
      pdfUrl,
      dimensions,
    };
  } catch (error) {
    console.error("Error uploading PDF template:", error);
    return { error: `Failed to upload template: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

/**
 * Process PDF template with text regions marked by admin
 * Step 2: Create clean background by erasing text regions
 */
export async function processPdfTemplate(params: {
  pdfUrl: string;
  previewUrl: string;
  textRegions: TextRegion[];
  name: string;
  nameHe: string;
  description?: string;
  descriptionHe?: string;
  eventType: EventType;
  fields: {
    fieldType: InvitationFieldType;
    label: string;
    labelHe?: string;
    region: TextRegion; // Which region this field corresponds to
    fontSize?: string;
    fontFamily?: string;
    fontWeight?: string;
    textColor?: string;
    textAlign?: string;
  }[];
}) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized" };
    }

    // Fetch the preview PNG
    const previewResponse = await fetch(params.previewUrl);
    if (!previewResponse.ok) {
      return { error: "Failed to fetch preview image" };
    }

    const previewBuffer = Buffer.from(await previewResponse.arrayBuffer());

    // Erase text regions to create clean background
    const cleanBackground = await smartEraseTextRegions(previewBuffer, params.textRegions);

    // Upload clean background to R2
    const timestamp = Date.now();
    const backgroundKey = `invitation-templates/background-${timestamp}.png`;
    await uploadToR2(backgroundKey, cleanBackground, "image/png");
    const backgroundUrl = await getPublicR2Url(backgroundKey);

    // Get dimensions from first region (or use default)
    const pdfResponse = await fetch(params.pdfUrl);
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const dimensions = await getPdfDimensions(pdfBuffer);

    // Create template in database
    const template = await prisma.invitationTemplate.create({
      data: {
        name: params.name,
        nameHe: params.nameHe,
        description: params.description,
        descriptionHe: params.descriptionHe,
        eventType: params.eventType,
        templateType: TemplateType.PDF,
        pdfUrl: params.pdfUrl,
        backgroundImageUrl: backgroundUrl,
        thumbnailUrl: params.previewUrl,
        width: Math.round(dimensions.width),
        height: Math.round(dimensions.height),
        fields: {
          create: params.fields.map((field, index) => ({
            fieldType: field.fieldType,
            label: field.label,
            labelHe: field.labelHe,
            fontSize: field.fontSize || "16px",
            fontFamily: field.fontFamily || "Heebo",
            fontWeight: field.fontWeight || "normal",
            textColor: field.textColor || "#000000",
            textAlign: field.textAlign || "center",
            top: `${field.region.top}px`,
            left: `${field.region.left}px`,
            width: `${field.region.width}px`,
            sortOrder: index,
          })),
        },
      },
      include: {
        fields: true,
      },
    });

    revalidatePath("/admin/invitation-templates");

    return {
      success: true,
      template,
    };
  } catch (error) {
    console.error("Error processing PDF template:", error);
    return { error: `Failed to process template: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

/**
 * Create HTML-based template (for custom designs)
 */
export async function createHtmlTemplate(params: {
  name: string;
  nameHe: string;
  description?: string;
  descriptionHe?: string;
  eventType: EventType;
  htmlContent: string;
  cssContent: string;
  width: number;
  height: number;
  fields: {
    fieldType: InvitationFieldType;
    label: string;
    labelHe?: string;
    placeholder?: string;
    isRequired: boolean;
    defaultValue?: string;
  }[];
}) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { error: "Unauthorized" };
    }

    const template = await prisma.invitationTemplate.create({
      data: {
        name: params.name,
        nameHe: params.nameHe,
        description: params.description,
        descriptionHe: params.descriptionHe,
        eventType: params.eventType,
        templateType: TemplateType.HTML,
        htmlContent: params.htmlContent,
        cssContent: params.cssContent,
        width: params.width,
        height: params.height,
        fields: {
          create: params.fields.map((field, index) => ({
            fieldType: field.fieldType,
            label: field.label,
            labelHe: field.labelHe,
            placeholder: field.placeholder,
            isRequired: field.isRequired,
            defaultValue: field.defaultValue,
            sortOrder: index,
          })),
        },
      },
      include: {
        fields: true,
      },
    });

    revalidatePath("/admin/invitation-templates");

    return {
      success: true,
      template,
    };
  } catch (error) {
    console.error("Error creating HTML template:", error);
    return { error: `Failed to create template: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

/**
 * Get all templates
 */
export async function getInvitationTemplates(eventType?: EventType) {
  try {
    const templates = await prisma.invitationTemplate.findMany({
      where: eventType ? { eventType, isActive: true } : { isActive: true },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, templates };
  } catch (error) {
    console.error("Error fetching templates:", error);
    return { error: "Failed to fetch templates" };
  }
}
