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
      where: {
        isActive: true,
      },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    });

    return { success: true, templates };
  } catch (error) {
    console.error("Error fetching all WhatsApp templates:", error);
    return { success: false, error: "Failed to fetch templates", templates: [] };
  }
}

/**
 * Admin: Get all templates - merges Twilio approved templates with local database
 * Shows assignment status for each Twilio template + locally created templates
 */
export async function getAllTemplatesWithTwilioSync() {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized", templates: [] };
    }

    // Get all local templates first
    const localTemplates = await prisma.whatsAppTemplate.findMany({
      where: { isActive: true },
    });

    // Fetch all approved templates from Twilio
    const twilioResult = await fetchTwilioApprovedTemplates();

    // Create a map of contentSid -> Twilio template for quick lookup
    const twilioMap = new Map<string, any>(
      twilioResult.success && twilioResult.templates
        ? twilioResult.templates.map((t) => [t.sid, t] as [string, any])
        : []
    );

    // Create a map of contentSid -> local template for quick lookup
    const localMap = new Map(
      localTemplates
        .filter((t) => t.contentSid)
        .map((t) => [t.contentSid, t])
    );

    const allTemplates: any[] = [];

    // 1. Add all Twilio approved templates (with assignment info if exists)
    if (twilioResult.success && twilioResult.templates) {
      for (const twilioTemplate of twilioResult.templates) {
        const assignment = localMap.get(twilioTemplate.sid);

        allTemplates.push({
          // Twilio data
          contentSid: twilioTemplate.sid,
          twilioTemplateName: twilioTemplate.friendlyName,
          contentType: twilioTemplate.contentType,
          templateBodyHe: twilioTemplate.fullBody,
          previewText: assignment?.previewText || twilioTemplate.previewText,
          previewTextHe: assignment?.previewTextHe || null,
          language: twilioTemplate.language,

          // Assignment data (from local DB if assigned)
          id: assignment?.id || null,
          type: assignment?.type || null,
          style: assignment?.style || null,
          nameHe: assignment?.nameHe || twilioTemplate.friendlyName,
          nameEn: assignment?.nameEn || twilioTemplate.friendlyName,
          isActive: true,
          approvalStatus: "APPROVED" as const,
          rejectionReason: assignment?.rejectionReason || null,
          isAssigned: !!assignment,

          // Metadata
          createdAt: assignment?.createdAt || new Date(twilioTemplate.dateCreated),
          updatedAt: assignment?.updatedAt || new Date(twilioTemplate.dateUpdated),
          submittedAt: assignment?.submittedAt || null,
          approvedAt: assignment?.approvedAt || null,
        });
      }
    }

    // 2. Add locally created templates that aren't in Twilio yet (DRAFT, PENDING without contentSid)
    const localOnlyTemplates = localTemplates.filter(
      (t) => !t.contentSid || !twilioMap.has(t.contentSid)
    );

    for (const localTemplate of localOnlyTemplates) {
      allTemplates.push({
        id: localTemplate.id,
        type: localTemplate.type,
        style: localTemplate.style,
        nameHe: localTemplate.nameHe,
        nameEn: localTemplate.nameEn,
        contentSid: localTemplate.contentSid,
        twilioTemplateName: localTemplate.twilioTemplateName,
        contentType: localTemplate.contentType,
        templateBodyHe: localTemplate.templateBodyHe,
        previewText: localTemplate.previewText,
        previewTextHe: localTemplate.previewTextHe,
        language: localTemplate.language,
        isActive: localTemplate.isActive,
        approvalStatus: localTemplate.approvalStatus,
        rejectionReason: localTemplate.rejectionReason,
        isAssigned: true, // Local templates are always assigned to a type/style
        createdAt: localTemplate.createdAt,
        updatedAt: localTemplate.updatedAt,
        submittedAt: localTemplate.submittedAt,
        approvedAt: localTemplate.approvedAt,
      });
    }

    return {
      success: true,
      templates: allTemplates,
    };
  } catch (error) {
    console.error("[getAllTemplatesWithTwilioSync] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch templates",
      templates: [],
    };
  }
}

/**
 * Admin: Fetch all approved templates from Twilio
 * This allows you to see and assign existing Twilio templates to your type/style combinations
 */
export async function fetchTwilioApprovedTemplates() {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized", templates: [] };
    }

    // Get Twilio credentials
    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings?.whatsappApiKey || !settings?.whatsappApiSecret) {
      return {
        success: false,
        error: "Twilio credentials not configured",
        templates: [],
      };
    }

    // Import Twilio client
    const { createTwilioContentClient } = await import("@/lib/twilio-content");

    const client = createTwilioContentClient(
      settings.whatsappApiKey,
      settings.whatsappApiSecret
    );

    // Fetch all templates from Twilio
    const result = await client.listContents(100); // Get up to 100 templates

    if (!result.success || !result.contents) {
      return {
        success: false,
        error: result.error || "Failed to fetch templates from Twilio",
        templates: [],
      };
    }

    // Fetch approval status for each template using the approval_fetch link
    const templatesWithStatus: typeof result.contents = [];

    for (const content of result.contents) {
      try {
        const approvalUrl = content.links?.approval_fetch;
        if (!approvalUrl) continue;

        // Fetch approval requests
        const response = await fetch(approvalUrl, {
          headers: {
            Authorization: `Basic ${Buffer.from(`${settings.whatsappApiKey}:${settings.whatsappApiSecret}`).toString("base64")}`,
          },
        });

        if (!response.ok) continue;

        const data = await response.json();

        // Check if WhatsApp approval exists and is approved
        const whatsappStatus = data.whatsapp?.status;

        if (whatsappStatus === "approved") {
          templatesWithStatus.push(content);
        }
      } catch (error) {
        // Silent error - continue with other templates
      }
    }

    const approvedTemplates = templatesWithStatus
      .map((content) => {
        // Extract full body and preview
        const extractBody = (): string => {
          // List of all possible content type fields to check
          const contentTypesToCheck = [
            "twilio/text",
            "twilio/quick-reply",
            "twilio/list-picker",
            "twilio/call-to-action",
            "twilio/media",
            "twilio/card", // Card templates
            "twilio/carousel", // Carousel templates
          ];

          // Try each known content type
          for (const typeName of contentTypesToCheck) {
            const typeContent = content.types[typeName as keyof typeof content.types] as { body?: string } | undefined;
            if (typeContent?.body) {
              return typeContent.body;
            }
          }

          // Fallback: try to get body from any type not yet checked
          for (const [typeName, typeData] of Object.entries(content.types)) {
            if (typeData && typeof typeData === 'object') {
              // Try different possible field names
              const possibleBodyFields = ['body', 'text', 'content', 'message'];

              for (const fieldName of possibleBodyFields) {
                if (fieldName in typeData) {
                  const body = (typeData as any)[fieldName];
                  if (typeof body === 'string' && body.length > 0) {
                    return body;
                  }
                }
              }
            }
          }

          return "";
        };

        const fullBody = extractBody();

        return {
          sid: content.sid,
          friendlyName: content.friendly_name,
          language: content.language,
          dateCreated: content.date_created,
          dateUpdated: content.date_updated,
          previewText: fullBody.substring(0, 100), // Preview (first 100 chars)
          fullBody: fullBody, // Full template body
          contentType: Object.keys(content.types)[0], // e.g., "twilio/text", "twilio/quick-reply"
        };
      });

    return {
      success: true,
      templates: approvedTemplates,
    };
  } catch (error) {
    console.error("[fetchTwilioApprovedTemplates] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch Twilio templates",
      templates: [],
    };
  }
}

/**
 * Admin: Assign an existing Twilio ContentSid to a template type/style
 */
export async function assignTwilioContentSid(data: {
  type: WhatsAppTemplateType;
  style: string;
  contentSid: string;
  friendlyName: string;
  previewText?: string;
}) {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    const prismaType = data.type as any;

    // Check if template already exists
    const existing = await prisma.whatsAppTemplate.findFirst({
      where: {
        type: prismaType,
        style: data.style,
      },
    });

    if (existing) {
      // Update existing template
      const updated = await prisma.whatsAppTemplate.update({
        where: { id: existing.id },
        data: {
          contentSid: data.contentSid,
          twilioTemplateName: data.friendlyName,
          previewText: data.previewText,
          approvalStatus: "APPROVED",
          approvedAt: new Date(),
          isActive: true,
        },
      });

      return {
        success: true,
        message: "Template updated with ContentSid",
        template: updated,
      };
    } else {
      // Create new template with assigned ContentSid
      const created = await prisma.whatsAppTemplate.create({
        data: {
          type: prismaType,
          style: data.style,
          nameHe: `סגנון ${data.style.replace("style", "")}`,
          nameEn: `Style ${data.style.replace("style", "")}`,
          contentSid: data.contentSid,
          twilioTemplateName: data.friendlyName,
          previewText: data.previewText,
          approvalStatus: "APPROVED",
          approvedAt: new Date(),
          isActive: true,
          sortOrder: data.style === "style1" ? 0 : data.style === "style2" ? 1 : 2,
        },
      });

      return {
        success: true,
        message: "Template created with ContentSid",
        template: created,
      };
    }
  } catch (error) {
    console.error("[assignTwilioContentSid] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign ContentSid",
    };
  }
}

/**
 * Admin: Create a new WhatsApp template (DRAFT status)
 */
export async function createWhatsAppTemplateContent(data: {
  type: WhatsAppTemplateType;
  style: string;
  nameHe: string;
  nameEn: string;
  twilioTemplateName: string;
  templateBodyHe: string;
  templateBodyEn: string;
  variables?: Record<string, string>;
  buttonsConfig?: Array<{ id: string; titleHe: string; titleEn?: string }>;
  previewText?: string;
  previewTextHe?: string;
  // New Twilio Content API fields
  contentType?: string;
  category?: string;
  language?: string;
  headerText?: string;
  footerText?: string;
  mediaType?: string;
  replaceExisting?: boolean;
}) {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    const prismaType = data.type as any;

    // Check if template already exists for this type/style
    const existing = await prisma.whatsAppTemplate.findFirst({
      where: {
        type: prismaType,
        style: data.style,
      },
    });

    // If an active template exists and replaceExisting is not true, ask for confirmation
    if (existing && existing.isActive && !data.replaceExisting) {
      return {
        success: false,
        error: "TEMPLATE_EXISTS",
        message: `Template already exists for ${data.type} - ${data.style}`,
        existingTemplateId: existing.id,
      } as any;
    }

    // If replaceExisting is true or an inactive template exists, delete it first
    if (existing && (data.replaceExisting || !existing.isActive)) {
      await prisma.whatsAppTemplate.delete({
        where: { id: existing.id },
      });
    }

    const template = await prisma.whatsAppTemplate.create({
      data: {
        type: prismaType,
        style: data.style,
        nameHe: data.nameHe,
        nameEn: data.nameEn,
        twilioTemplateName: data.twilioTemplateName,
        templateBodyHe: data.templateBodyHe,
        templateBodyEn: data.templateBodyEn,
        variables: data.variables || {},
        buttonsConfig: data.buttonsConfig || [],
        previewText: data.previewText,
        previewTextHe: data.previewTextHe,
        approvalStatus: "DRAFT",
        sortOrder: data.style === "style1" ? 0 : data.style === "style2" ? 1 : 2,
        isActive: true, // Active immediately so it shows in the list
        // New Twilio Content API fields
        contentType: data.contentType,
        category: data.category,
        language: data.language,
        headerText: data.headerText,
        footerText: data.footerText,
        mediaType: data.mediaType,
      },
    });

    return { success: true, template };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create template";
    return { success: false, error: errorMessage };
  }
}

/**
 * Admin: Update a WhatsApp template (only DRAFT templates can be edited)
 */
export async function updateWhatsAppTemplateContent(data: {
  id: string;
  templateBodyHe?: string;
  templateBodyEn?: string;
  variables?: Record<string, string>;
  buttonsConfig?: Array<{ id: string; titleHe: string; titleEn: string }>;
  previewText?: string;
  previewTextHe?: string;
}) {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if template exists and is DRAFT
    const existing = await prisma.whatsAppTemplate.findUnique({
      where: { id: data.id },
    });

    if (!existing) {
      return { success: false, error: "Template not found" };
    }

    if (existing.approvalStatus !== "DRAFT") {
      return {
        success: false,
        error: `Cannot edit template with status: ${existing.approvalStatus}. Only DRAFT templates can be edited.`,
      };
    }

    const template = await prisma.whatsAppTemplate.update({
      where: { id: data.id },
      data: {
        templateBodyHe: data.templateBodyHe,
        templateBodyEn: data.templateBodyEn,
        variables: data.variables,
        buttonsConfig: data.buttonsConfig,
        previewText: data.previewText,
        previewTextHe: data.previewTextHe,
      },
    });

    return { success: true, template };
  } catch (error) {
    console.error("[updateWhatsAppTemplateContent] Error:", error);
    return { success: false, error: "Failed to update template" };
  }
}

/**
 * Admin: Submit template to Twilio for WhatsApp approval
 */
export async function submitTemplateToTwilio(templateId: string) {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    // Get template
    const template = await prisma.whatsAppTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // Allow submission for:
    // 1. DRAFT templates (normal flow)
    // 2. PENDING templates WITHOUT contentSid (stuck templates that were never actually submitted)
    const canSubmit =
      template.approvalStatus === "DRAFT" ||
      (template.approvalStatus === "PENDING" && !template.contentSid);

    if (!canSubmit) {
      if (template.contentSid) {
        return {
          success: false,
          error: `Template already submitted to Twilio (ContentSid: ${template.contentSid}). Status: ${template.approvalStatus}`,
        };
      }
      return {
        success: false,
        error: `Cannot submit template with status: ${template.approvalStatus}. Only DRAFT or stuck PENDING templates can be submitted.`,
      };
    }

    if (!template.templateBodyHe) {
      return {
        success: false,
        error: "Template body is required in Hebrew",
      };
    }

    // Get Twilio credentials from database
    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings?.whatsappApiKey || !settings?.whatsappApiSecret) {
      return {
        success: false,
        error: "Twilio credentials not configured. Please configure in Admin > Messaging Settings.",
      };
    }

    // Import Twilio client (dynamic to avoid loading on every request)
    const { createTwilioContentClient } = await import("@/lib/twilio-content");

    const client = createTwilioContentClient(
      settings.whatsappApiKey,
      settings.whatsappApiSecret
    );

    // Build the content request based on template's contentType
    const contentType = template.contentType || "twilio/text";
    const hasButtons = Boolean(
      template.buttonsConfig &&
        Array.isArray(template.buttonsConfig) &&
        template.buttonsConfig.length > 0
    );

    // Build the types object based on contentType
    const types: any = {};

    if (contentType === "twilio/quick-reply" && hasButtons) {
      // Quick reply with buttons
      types[contentType] = {
        body: template.templateBodyHe,
        actions: (template.buttonsConfig as any[]).map((btn: any) => ({
          type: "QUICK_REPLY",
          id: btn.id,
          title: btn.titleHe,
        })),
      };
    } else if (contentType === "twilio/media") {
      // Media template
      types[contentType] = {
        body: template.templateBodyHe || undefined,
        media: template.mediaType ? [template.mediaType] : undefined,
      };
    } else if (contentType === "twilio/card") {
      // Card template (can have body, header, and buttons)
      const cardContent: any = {
        body: template.templateBodyHe,
      };

      if (template.headerText) {
        cardContent.header = template.headerText;
      }

      // Card templates can also have buttons
      if (hasButtons) {
        cardContent.actions = (template.buttonsConfig as any[]).map((btn: any) => ({
          type: "QUICK_REPLY",
          id: btn.id,
          title: btn.titleHe,
        }));
      }

      types[contentType] = cardContent;
    } else if (contentType === "whatsapp/card") {
      // WhatsApp Card template (can have body, header, media, and buttons)
      const whatsappCardContent: any = {
        body: template.templateBodyHe,
      };

      if (template.headerText) {
        whatsappCardContent.header = template.headerText;
      }

      // Add media URL if media type is specified (uses {{10}} variable with Cloudinary pattern)
      if (template.mediaType) {
        whatsappCardContent.media = ["https://res.cloudinary.com/{{10}}"];
      }

      // WhatsApp Card templates can also have buttons
      if (hasButtons) {
        whatsappCardContent.actions = (template.buttonsConfig as any[]).map((btn: any) => ({
          type: "QUICK_REPLY",
          id: btn.id,
          title: btn.titleHe,
        }));
      }

      types[contentType] = whatsappCardContent;
    } else if (contentType === "twilio/list-picker") {
      // List picker template
      types[contentType] = {
        body: template.templateBodyHe,
      };
    } else {
      // Default: text template
      types["twilio/text"] = {
        body: template.templateBodyHe,
      };
    }

    // Import example values helper
    const { getExampleVariables } = await import("@/lib/notifications/whatsapp-template-renderer");

    // Get example values for WhatsApp approval
    const exampleVariables = getExampleVariables();

    // Build Hebrew template request
    const hebrewRequest: any = {
      friendly_name:
        template.twilioTemplateName ||
        `wedinex_${template.type.toLowerCase()}_${template.style}_he`,
      language: template.language || "he",
      variables: (template.variables as any) || undefined,
      content_variables: exampleVariables, // Example values for WhatsApp approval
      types,
    };

    // Submit Hebrew template to Twilio Content API
    const hebrewResult = await client.createContent(hebrewRequest);

    if (!hebrewResult.success) {
      return {
        success: false,
        error: `Failed to create template: ${hebrewResult.error}`,
      };
    }

    // Step 2: Submit for WhatsApp approval
    const category = template.category || "UTILITY";
    const templateName = template.twilioTemplateName || `wedinex_${template.type?.toLowerCase()}_${template.style}`;

    const approvalResult = await client.submitForWhatsAppApproval(
      hebrewResult.contentSid!,
      category,
      templateName
    );

    if (!approvalResult.success) {
      // Return error to user - WhatsApp approval submission is critical
      return {
        success: false,
        error: `Template created in Twilio but failed to submit to WhatsApp: ${approvalResult.error}`,
        template,
      };
    }

    // Update template with ContentSid and PENDING status
    const updatedTemplate = await prisma.whatsAppTemplate.update({
      where: { id: templateId },
      data: {
        contentSid: hebrewResult.contentSid,
        approvalStatus: "PENDING",
        submittedAt: new Date(),
      },
    });

    return {
      success: true,
      template: updatedTemplate,
      contentSid: hebrewResult.contentSid,
      submittedToWhatsApp: approvalResult.success,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit template",
    };
  }
}

/**
 * Admin: Check template approval status from Twilio
 */
export async function checkTemplateApprovalStatus(templateId: string) {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    // Get template
    const template = await prisma.whatsAppTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    if (!template.contentSid) {
      return {
        success: false,
        error: "Template has not been submitted to Twilio yet",
      };
    }

    // Get Twilio credentials
    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings?.whatsappApiKey || !settings?.whatsappApiSecret) {
      return { success: false, error: "Twilio credentials not configured" };
    }

    // Import Twilio client
    const { createTwilioContentClient } = await import("@/lib/twilio-content");

    const client = createTwilioContentClient(
      settings.whatsappApiKey,
      settings.whatsappApiSecret
    );

    // Check status from Twilio
    const result = await client.getContent(template.contentSid);

    if (!result.success) {
      return {
        success: false,
        error: `Failed to check status: ${result.error}`,
      };
    }

    console.log(`[checkTemplateApprovalStatus] Twilio returned status: "${result.status}" for template ${templateId}`);

    // Map Twilio status to our status
    let newStatus: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "PAUSED" = template.approvalStatus as any;

    // Twilio/WhatsApp status mapping (case-insensitive)
    const twilioStatus = result.status?.toLowerCase();

    if (twilioStatus === "approved") {
      newStatus = "APPROVED";
    } else if (twilioStatus === "rejected") {
      newStatus = "REJECTED";
    } else if (twilioStatus === "paused" || twilioStatus === "disabled") {
      newStatus = "PAUSED";
    } else if (twilioStatus === "pending_review" || twilioStatus === "pending") {
      newStatus = "PENDING";
    } else if (twilioStatus === "unsubmitted" || twilioStatus === "draft") {
      newStatus = "DRAFT";
    } else {
      console.warn(`[checkTemplateApprovalStatus] Unknown status from Twilio: "${result.status}". Keeping current status: ${template.approvalStatus}`);
    }

    // Always update contentType from Twilio if available
    const updateData: any = {};
    let shouldUpdate = false;

    // Update status if changed
    if (newStatus !== template.approvalStatus) {
      updateData.approvalStatus = newStatus;
      shouldUpdate = true;

      if (newStatus === "APPROVED") {
        updateData.approvedAt = new Date();
        updateData.isActive = true; // Activate approved templates
      }

      if (newStatus === "REJECTED") {
        updateData.rejectionReason = result.rejectionReason || "Rejected by WhatsApp";
      }
    }

    // Update contentType from Twilio (always, to ensure accuracy)
    if (result.contentType && result.contentType !== template.contentType) {
      updateData.contentType = result.contentType;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      await prisma.whatsAppTemplate.update({
        where: { id: templateId },
        data: updateData,
      });
    }

    return {
      success: true,
      status: newStatus,
      previousStatus: template.approvalStatus,
      changed: newStatus !== template.approvalStatus,
    };
  } catch (error) {
    console.error("[checkTemplateApprovalStatus] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check status",
    };
  }
}

/**
 * Admin: Sync all PENDING templates (submit + check approval status for all)
 *
 * This function:
 * 1. Finds all PENDING templates
 * 2. For templates WITHOUT contentSid: submits them to Twilio first
 * 3. For templates WITH contentSid: checks their approval status
 */
export async function syncAllPendingTemplates() {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    // Get ALL PENDING templates (with or without contentSid)
    const pendingTemplates = await prisma.whatsAppTemplate.findMany({
      where: {
        approvalStatus: "PENDING",
      },
    });

    if (pendingTemplates.length === 0) {
      return {
        success: true,
        message: "No pending templates to sync",
        results: [],
      };
    }

    // Process each template
    const results: any[] = [];
    let submittedCount = 0;
    let updatedCount = 0;

    for (const template of pendingTemplates) {
      try {
        // If template doesn't have contentSid, submit it to Twilio first
        if (!template.contentSid) {
          const submitResult = await submitTemplateToTwilio(template.id);

          if (submitResult.success) {
            submittedCount++;
            results.push({
              templateId: template.id,
              type: template.type,
              style: template.style,
              action: "submitted",
              success: true,
              contentSid: submitResult.contentSid,
            });
          } else {
            results.push({
              templateId: template.id,
              type: template.type,
              style: template.style,
              action: "submit_failed",
              success: false,
              error: submitResult.error,
            });
          }
        } else {
          // Template has contentSid, check approval status
          const statusResult = await checkTemplateApprovalStatus(template.id);

          if (statusResult.changed) {
            updatedCount++;
          }

          results.push({
            templateId: template.id,
            type: template.type,
            style: template.style,
            action: "status_checked",
            ...statusResult,
          });
        }
      } catch (error) {
        results.push({
          templateId: template.id,
          type: template.type,
          style: template.style,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success !== false).length;

    return {
      success: true,
      message: `Synced ${pendingTemplates.length} templates: ${submittedCount} submitted, ${updatedCount} status changes, ${successCount} succeeded`,
      results,
      submittedCount,
      updatedCount,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync templates",
    };
  }
}

/**
 * Admin: Reset a stuck PENDING template back to DRAFT
 * Used for templates that are PENDING but never got submitted (no contentSid)
 */
export async function resetStuckTemplate(templateId: string) {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    const template = await prisma.whatsAppTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // Only reset PENDING templates without contentSid
    if (template.approvalStatus !== "PENDING" || template.contentSid) {
      return {
        success: false,
        error: "Can only reset stuck PENDING templates (without contentSid)",
      };
    }

    await prisma.whatsAppTemplate.update({
      where: { id: templateId },
      data: {
        approvalStatus: "DRAFT",
        submittedAt: null,
      },
    });

    return {
      success: true,
      message: "Template reset to DRAFT. You can now edit and resubmit it.",
    };
  } catch (error) {
    console.error("[resetStuckTemplate] Error:", error);
    return { success: false, error: "Failed to reset template" };
  }
}

/**
 * Submit a template to Twilio for WhatsApp approval
 */
export async function submitTemplateForApproval(templateId: string) {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the template
    const template = await prisma.whatsAppTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // For now, we'll mark it as PENDING and return success
    // In a full implementation, this would call the Twilio Content API
    // to submit the template for approval

    await prisma.whatsAppTemplate.update({
      where: { id: templateId },
      data: {
        approvalStatus: "PENDING",
        submittedAt: new Date(),
      },
    });

    return {
      success: true,
      status: "pending" as const,
      message: "Template submitted for approval",
    };
  } catch (error) {
    console.error("[submitTemplateForApproval] Error:", error);
    return { success: false, error: "Failed to submit template" };
  }
}

/**
 * Admin: Sync content types from Twilio for all templates
 * Fetches the actual content type from Twilio for each template with a contentSid
 */
export async function syncTemplateContentTypesFromTwilio() {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    // Get Twilio credentials
    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings?.whatsappApiKey || !settings?.whatsappApiSecret) {
      return { success: false, error: "Twilio credentials not configured" };
    }

    // Import Twilio client
    const { createTwilioContentClient } = await import("@/lib/twilio-content");
    const client = createTwilioContentClient(
      settings.whatsappApiKey,
      settings.whatsappApiSecret
    );

    // Get all templates with contentSid
    const templates = await prisma.whatsAppTemplate.findMany({
      where: {
        isActive: true,
        contentSid: { not: null },
      },
    });

    let updatedCount = 0;
    const results: Array<{
      id: string;
      type: string;
      style: string;
      oldContentType: string | null;
      newContentType: string;
    }> = [];

    for (const template of templates) {
      if (!template.contentSid) continue;

      try {
        // Fetch actual content type from Twilio
        const result = await client.getContent(template.contentSid);

        if (result.success && result.contentType && result.contentType !== template.contentType) {
          await prisma.whatsAppTemplate.update({
            where: { id: template.id },
            data: { contentType: result.contentType },
          });

          updatedCount++;
          results.push({
            id: template.id,
            type: template.type,
            style: template.style,
            oldContentType: template.contentType,
            newContentType: result.contentType,
          });
        }
      } catch (error) {
        // Silent error - continue with other templates
      }
    }

    return {
      success: true,
      message: `Synced ${updatedCount} template content types from Twilio`,
      updatedCount,
      results,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync content types",
    };
  }
}
