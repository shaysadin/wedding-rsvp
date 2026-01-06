/**
 * WhatsApp messaging utilities
 */

import { prisma } from "@/lib/db";
import { formatToE164 } from "@/lib/notifications/phone-formatter";
import {
  createTwilioClient,
  sendWhatsAppWithMedia,
} from "@/lib/notifications/twilio-service";

interface SendWhatsAppImageOptions {
  to: string;
  imageUrl: string;
  caption?: string;
}

interface SendWhatsAppImageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a WhatsApp image message
 */
export async function sendWhatsAppImage(
  options: SendWhatsAppImageOptions
): Promise<SendWhatsAppImageResult> {
  try {
    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings) {
      return {
        success: false,
        error: "Messaging not configured",
      };
    }

    if (!settings.whatsappEnabled) {
      return {
        success: false,
        error: "WhatsApp is not enabled",
      };
    }

    if (!settings.whatsappApiKey || !settings.whatsappApiSecret || !settings.whatsappPhoneNumber) {
      return {
        success: false,
        error: "WhatsApp credentials not configured",
      };
    }

    // Format phone number to E.164 format
    const phoneNumber = formatToE164(options.to, "IL");

    // Create Twilio client
    const client = createTwilioClient(
      settings.whatsappApiKey,
      settings.whatsappApiSecret
    );

    // Send the image message
    const result = await sendWhatsAppWithMedia(
      client,
      settings.whatsappPhoneNumber,
      phoneNumber,
      options.imageUrl,
      options.caption
    );

    if (result.success) {
      return {
        success: true,
        messageId: result.messageId,
      };
    }

    return {
      success: false,
      error: result.error || "Failed to send WhatsApp image",
    };
  } catch (error) {
    console.error("Error sending WhatsApp image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send WhatsApp image",
    };
  }
}
