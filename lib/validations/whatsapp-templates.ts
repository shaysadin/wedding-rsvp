/**
 * WhatsApp Template Validation Schemas
 *
 * Zod schemas for validating template creation and management operations.
 */

import { z } from "zod";
import type { WhatsAppTemplateType } from "@/config/whatsapp-templates";

/**
 * Button configuration schema
 */
export const buttonConfigSchema = z.object({
  id: z.string().min(1, "Button ID is required"),
  titleHe: z
    .string()
    .min(1, "Hebrew button text is required")
    .max(20, "Button text must be 20 characters or less"),
  titleEn: z
    .string()
    .min(1, "English button text is required")
    .max(20, "Button text must be 20 characters or less"),
});

export type ButtonConfigInput = z.input<typeof buttonConfigSchema>;

/**
 * Variables schema (JSON object with string keys and values)
 */
export const variablesSchema = z.record(z.string(), z.string()).optional();

/**
 * Template body validation
 * - Max 1024 characters
 * - Variables must be in format {{1}}, {{2}}, etc.
 * - Variables must be sequential
 */
const templateBodySchema = z
  .string()
  .min(1, "Template body is required")
  .max(1024, "Template body must be 1024 characters or less")
  .refine(
    (body) => {
      // Check for valid variable syntax
      const variablePattern = /\{\{(\d+)\}\}/g;
      const matches = body.match(variablePattern);

      if (!matches) return true; // No variables is valid

      const variableNumbers = matches.map((match) => {
        const num = match.match(/\d+/);
        return num ? parseInt(num[0]) : 0;
      });

      // Check for sequential variables (1, 2, 3, not 1, 3, 5)
      const uniqueNumbers = [...new Set(variableNumbers)].sort((a, b) => a - b);
      for (let i = 0; i < uniqueNumbers.length; i++) {
        if (uniqueNumbers[i] !== i + 1) {
          return false; // Gap found
        }
      }

      return true;
    },
    {
      message: "Variables must be sequential starting from {{1}} (e.g., {{1}}, {{2}}, {{3}})",
    }
  );

/**
 * Create WhatsApp Template Schema
 */
export const createWhatsAppTemplateSchema = z.object({
  type: z.enum([
    "INVITE",
    "REMINDER",
    "INTERACTIVE_INVITE",
    "INTERACTIVE_REMINDER",
    "IMAGE_INVITE",
    "TRANSPORTATION_INVITE",
    "CONFIRMATION",
    "EVENT_DAY",
    "THANK_YOU",
    "TABLE_ASSIGNMENT",
    "GUEST_COUNT_LIST",
  ] as const),
  style: z.enum(["style1", "style2", "style3"]),
  nameHe: z.string().min(1, "Hebrew name is required"),
  nameEn: z.string().min(1, "English name is required"),
  twilioTemplateName: z
    .string()
    .min(1, "Twilio template name is required")
    .regex(
      /^[a-z0-9_]+$/,
      "Template name must be lowercase alphanumeric with underscores only"
    ),
  templateBodyHe: templateBodySchema,
  templateBodyEn: templateBodySchema,
  variables: variablesSchema,
  buttonsConfig: z.array(buttonConfigSchema).min(0).max(3).optional(),
  previewText: z.string().optional(),
  previewTextHe: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateWhatsAppTemplateInput = z.input<typeof createWhatsAppTemplateSchema>;

/**
 * Update WhatsApp Template Schema (for editing drafts)
 */
export const updateWhatsAppTemplateSchema = z.object({
  id: z.string().cuid(),
  templateBodyHe: templateBodySchema.optional(),
  templateBodyEn: templateBodySchema.optional(),
  variables: variablesSchema,
  buttonsConfig: z.array(buttonConfigSchema).min(0).max(3).optional(),
  previewText: z.string().optional(),
  previewTextHe: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateWhatsAppTemplateInput = z.input<typeof updateWhatsAppTemplateSchema>;

/**
 * Submit Template to Twilio Schema
 */
export const submitTemplateToTwilioSchema = z.object({
  templateId: z.string().cuid(),
});

export type SubmitTemplateToTwilioInput = z.input<typeof submitTemplateToTwilioSchema>;

/**
 * Check Template Approval Status Schema
 */
export const checkTemplateApprovalSchema = z.object({
  templateId: z.string().cuid(),
});

export type CheckTemplateApprovalInput = z.input<typeof checkTemplateApprovalSchema>;

/**
 * Delete Template Schema
 */
export const deleteTemplateSchema = z.object({
  templateId: z.string().cuid(),
});

export type DeleteTemplateInput = z.input<typeof deleteTemplateSchema>;

/**
 * Bulk Submit Templates Schema
 */
export const bulkSubmitTemplatesSchema = z.object({
  templateIds: z.array(z.string().cuid()).min(1, "At least one template ID is required"),
});

export type BulkSubmitTemplatesInput = z.input<typeof bulkSubmitTemplatesSchema>;

/**
 * Sync All Pending Templates Schema
 */
export const syncPendingTemplatesSchema = z.object({
  // No parameters needed - will sync all PENDING templates
});

export type SyncPendingTemplatesInput = z.input<typeof syncPendingTemplatesSchema>;
