import { z } from "zod";

/**
 * Twilio WhatsApp webhook payload schema
 * Reference: https://www.twilio.com/docs/messaging/guides/webhook-request
 */
export const twilioWhatsAppWebhookSchema = z.object({
  MessageSid: z.string(),
  From: z.string(),
  To: z.string(),
  Body: z.string().optional(),
  ButtonPayload: z.string().optional(),
  ListId: z.string().optional(),
  OriginalRepliedMessageSid: z.string().optional(),
});

export type TwilioWhatsAppWebhook = z.infer<typeof twilioWhatsAppWebhookSchema>;

/**
 * Twilio status callback webhook payload schema
 * Reference: https://www.twilio.com/docs/messaging/guides/track-outbound-message-status
 */
export const twilioStatusWebhookSchema = z.object({
  MessageSid: z.string(),
  MessageStatus: z.string(),
  ErrorCode: z.string().optional(),
  ErrorMessage: z.string().optional(),
});

export type TwilioStatusWebhook = z.infer<typeof twilioStatusWebhookSchema>;

/**
 * VAPI webhook payload schema
 * Reference: VAPI documentation
 */
export const vapiWebhookSchema = z.object({
  type: z.enum([
    "call.started",
    "call.ringing",
    "call.connected",
    "call.ended",
    "transcript",
    "tool-calls",
  ]),
  call: z
    .object({
      id: z.string().optional(),
      endedReason: z.string().optional(),
      endedAt: z.string().optional(),
      createdAt: z.string().optional(),
      transcript: z.string().optional(),
    })
    .optional(),
});

export type VapiWebhook = z.infer<typeof vapiWebhookSchema>;

/**
 * Meshulam gift payment webhook payload schema
 */
export const meshulamWebhookSchema = z.object({
  status: z.string(),
  transactionId: z.string().optional(),
  amount: z.number().optional(),
  // Add other Meshulam-specific fields as needed
});

export type MeshulamWebhook = z.infer<typeof meshulamWebhookSchema>;
