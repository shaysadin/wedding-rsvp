/**
 * Twilio Service for SMS and WhatsApp messaging
 *
 * This service implements the official Twilio API for sending messages.
 *
 * References:
 * - SMS: https://www.twilio.com/docs/messaging/tutorials/how-to-send-sms-messages
 * - WhatsApp: https://www.twilio.com/docs/whatsapp/quickstart
 *
 * TRIAL ACCOUNT LIMITATIONS:
 * - Can only send to Verified Caller IDs (verified phone numbers)
 * - Messages prefixed with "Sent from your Twilio trial account -"
 * - Maximum 50 messages per day
 * - Cannot use WhatsApp Business API (only WhatsApp Sandbox)
 * - Limited to 1 phone number
 *
 * Reference: https://help.twilio.com/articles/360036052753-Twilio-Free-Trial-Limitations
 */

import Twilio from "twilio";
import { NotificationChannel, NotificationStatus, Guest, WeddingEvent } from "@prisma/client";

import { prisma } from "@/lib/db";
import { NotificationResult } from "@/lib/notifications/types";
import { formatToE164 } from "@/lib/notifications/phone-formatter";

// Twilio client type
type TwilioClient = ReturnType<typeof Twilio>;

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  smsPhoneNumber?: string;
  whatsappPhoneNumber?: string;
}

interface SendMessageOptions {
  to: string;
  body: string;
  channel: NotificationChannel;
}

// Trial account error codes
const TRIAL_ERROR_CODES = {
  21608: "UNVERIFIED_RECIPIENT", // The 'to' phone number is not verified
  21219: "TRIAL_CANNOT_SEND_TO_TWILIO", // Trial cannot send to Twilio numbers
};

// Common Twilio error messages with user-friendly descriptions
const ERROR_MESSAGES: Record<number, string> = {
  // Authentication errors
  20003: "Invalid Account SID or Auth Token. Check your credentials.",

  // SMS errors
  21211: "Invalid 'To' phone number format. Use E.164 format (+1234567890).",
  21212: "Invalid 'From' phone number. Ensure your Twilio number is correct.",
  21219: "Trial accounts cannot send SMS to other Twilio numbers.",
  21408: "Permission denied. Your account may need verification.",
  21606: "The 'From' phone number is not owned by your account.",
  21608: "TRIAL ACCOUNT: This phone number is not verified. Add it to your Verified Caller IDs in the Twilio Console.",
  21610: "Recipient has opted out of receiving messages from this number.",
  21611: "Maximum number of queued messages reached.",
  21614: "The 'To' number is not a valid mobile number.",
  21617: "The message body exceeds the maximum allowed length.",

  // WhatsApp errors
  63001: "WhatsApp sender not registered. Set up WhatsApp Sandbox or register your number.",
  63003: "Recipient hasn't opted in to WhatsApp. They must message your number first.",
  63007: "Outside 24-hour window. Use approved WhatsApp templates only.",
  63016: "Rate limited by WhatsApp. Wait before sending more messages.",
  63018: "Template not approved by WhatsApp.",

  // Rate limiting
  14107: "Rate limit exceeded. Too many requests.",
};

/**
 * Create a Twilio client with the provided credentials
 */
export function createTwilioClient(accountSid: string, authToken: string): TwilioClient {
  return Twilio(accountSid, authToken);
}

/**
 * Test Twilio SMS connection by verifying credentials
 * According to Twilio docs, we can verify by fetching account info
 */
export async function testSmsConnection(config: TwilioConfig): Promise<{
  success: boolean;
  message: string;
  accountInfo?: {
    friendlyName: string;
    status: string;
  };
}> {
  try {
    if (!config.accountSid || !config.authToken) {
      return {
        success: false,
        message: "Missing Account SID or Auth Token",
      };
    }

    const client = createTwilioClient(config.accountSid, config.authToken);

    // Verify credentials by fetching account info
    const account = await client.api.accounts(config.accountSid).fetch();

    // Check if we have a phone number configured
    if (config.smsPhoneNumber) {
      // Verify the phone number exists in the account
      try {
        const phoneNumbers = await client.incomingPhoneNumbers.list({
          phoneNumber: config.smsPhoneNumber,
        });

        if (phoneNumbers.length === 0) {
          return {
            success: false,
            message: `Phone number ${config.smsPhoneNumber} not found in your Twilio account`,
            accountInfo: {
              friendlyName: account.friendlyName,
              status: account.status,
            },
          };
        }
      } catch (phoneError: any) {
        // If we can't verify phone, still return success for credentials
        console.warn("Could not verify phone number:", phoneError.message);
      }
    }

    return {
      success: true,
      message: "SMS connection verified successfully",
      accountInfo: {
        friendlyName: account.friendlyName,
        status: account.status,
      },
    };
  } catch (error: any) {
    // Twilio returns specific error codes
    if (error.code === 20003) {
      return {
        success: false,
        message: "Invalid Account SID or Auth Token",
      };
    }

    return {
      success: false,
      message: error.message || "Failed to connect to Twilio SMS",
    };
  }
}

/**
 * Test Twilio WhatsApp connection
 * WhatsApp uses the same Twilio API but with "whatsapp:" prefix
 */
export async function testWhatsAppConnection(config: TwilioConfig): Promise<{
  success: boolean;
  message: string;
  accountInfo?: {
    friendlyName: string;
    status: string;
  };
}> {
  try {
    if (!config.accountSid || !config.authToken) {
      return {
        success: false,
        message: "Missing Account SID or Auth Token",
      };
    }

    const client = createTwilioClient(config.accountSid, config.authToken);

    // Verify credentials by fetching account info
    const account = await client.api.accounts(config.accountSid).fetch();

    // For WhatsApp, verify the phone number format
    if (config.whatsappPhoneNumber) {
      // WhatsApp phone numbers should be in E.164 format
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(config.whatsappPhoneNumber)) {
        return {
          success: false,
          message: "WhatsApp phone number must be in E.164 format (e.g., +1234567890)",
          accountInfo: {
            friendlyName: account.friendlyName,
            status: account.status,
          },
        };
      }

      // Note: We can't directly verify WhatsApp sender registration via API
      // The user must ensure the number is registered in Twilio's WhatsApp Sender setup
    }

    return {
      success: true,
      message: "WhatsApp connection verified successfully. Ensure your number is registered as a WhatsApp Sender in Twilio Console.",
      accountInfo: {
        friendlyName: account.friendlyName,
        status: account.status,
      },
    };
  } catch (error: any) {
    if (error.code === 20003) {
      return {
        success: false,
        message: "Invalid Account SID or Auth Token",
      };
    }

    return {
      success: false,
      message: error.message || "Failed to connect to Twilio WhatsApp",
    };
  }
}

/**
 * Send an SMS message using Twilio
 * Reference: https://www.twilio.com/docs/messaging/tutorials/how-to-send-sms-messages
 */
export async function sendSms(
  client: TwilioClient,
  fromNumber: string,
  toNumber: string,
  body: string
): Promise<{
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  errorCode?: number;
  isTrialError?: boolean;
}> {
  try {
    // Send the message using Twilio's messages.create API
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to: toNumber,
    });

    return {
      success: true,
      messageId: message.sid,
      status: message.status,
    };
  } catch (error: any) {
    console.error("Twilio SMS error:", error);

    // Use centralized error messages for known error codes
    const errorMessage = error.code && ERROR_MESSAGES[error.code]
      ? ERROR_MESSAGES[error.code]
      : error.message || "Failed to send SMS";

    return {
      success: false,
      error: errorMessage,
      errorCode: error.code,
      isTrialError: error.code && TRIAL_ERROR_CODES[error.code as keyof typeof TRIAL_ERROR_CODES] !== undefined,
    };
  }
}

/**
 * Send a WhatsApp message using Twilio
 * Reference: https://www.twilio.com/docs/whatsapp/quickstart
 *
 * Important: WhatsApp requires the "whatsapp:" prefix before phone numbers
 *
 * For WhatsApp Business API, use contentSid (approved templates) instead of body.
 * Free-form messages (body) only work within 24-hour window after user initiates contact.
 */
export async function sendWhatsApp(
  client: TwilioClient,
  fromNumber: string,
  toNumber: string,
  body: string,
  options?: {
    contentSid?: string;
    contentVariables?: Record<string, string>;
  }
): Promise<{
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  errorCode?: number;
  isTrialError?: boolean;
}> {
  try {
    // Format numbers with whatsapp: prefix as per Twilio documentation
    const from = fromNumber.startsWith("whatsapp:")
      ? fromNumber
      : `whatsapp:${fromNumber}`;
    const to = toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`;

    console.log("=".repeat(60));
    console.log("📱 SENDING WHATSAPP MESSAGE VIA TWILIO");
    console.log("=".repeat(60));
    console.log(`From: ${from}`);
    console.log(`To: ${to}`);

    let message;

    if (options?.contentSid) {
      // Use Content Template (required for WhatsApp Business API outside 24h window)
      console.log(`Using Content Template SID: ${options.contentSid}`);
      console.log(`Content Variables: ${JSON.stringify(options.contentVariables || {})}`);
      console.log("-".repeat(60));

      const messageParams: any = {
        from,
        to,
        contentSid: options.contentSid,
      };

      // Add content variables if provided
      if (options.contentVariables && Object.keys(options.contentVariables).length > 0) {
        messageParams.contentVariables = JSON.stringify(options.contentVariables);
      }

      message = await client.messages.create(messageParams);
    } else {
      // Use free-form body (only works within 24h session window)
      console.log(`Message length: ${body.length} characters`);
      console.log("-".repeat(60));
      console.log("⚠️  Using free-form message - this only works within 24h session window");

      message = await client.messages.create({
        body,
        from,
        to,
      });
    }

    console.log("✅ TWILIO API RESPONSE:");
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   Direction: ${message.direction}`);
    console.log(`   Date Created: ${message.dateCreated}`);
    console.log(`   Error Code: ${message.errorCode || "none"}`);
    console.log(`   Error Message: ${message.errorMessage || "none"}`);
    console.log("=".repeat(60));

    // Note: Twilio returns 'queued' or 'accepted' initially, not 'delivered'
    // The actual delivery status comes via webhook
    return {
      success: true,
      messageId: message.sid,
      status: message.status,
    };
  } catch (error: any) {
    console.error("=".repeat(60));
    console.error("❌ TWILIO WHATSAPP ERROR:");
    console.error(`   Error Code: ${error.code}`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   More Info: ${error.moreInfo || "N/A"}`);
    console.error("=".repeat(60));

    // Use centralized error messages for known error codes
    const errorMessage = error.code && ERROR_MESSAGES[error.code]
      ? ERROR_MESSAGES[error.code]
      : error.message || "Failed to send WhatsApp message";

    return {
      success: false,
      error: errorMessage,
      errorCode: error.code,
      isTrialError: error.code && TRIAL_ERROR_CODES[error.code as keyof typeof TRIAL_ERROR_CODES] !== undefined,
    };
  }
}

/**
 * Send a WhatsApp message with an image using Twilio
 * Reference: https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates#media-message
 *
 * Important: The media URL must be publicly accessible
 */
export async function sendWhatsAppWithMedia(
  client: TwilioClient,
  fromNumber: string,
  toNumber: string,
  mediaUrl: string,
  body?: string
): Promise<{
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  errorCode?: number;
  isTrialError?: boolean;
}> {
  try {
    // Format numbers with whatsapp: prefix as per Twilio documentation
    const from = fromNumber.startsWith("whatsapp:")
      ? fromNumber
      : `whatsapp:${fromNumber}`;
    const to = toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`;

    console.log("=".repeat(60));
    console.log("📱 SENDING WHATSAPP IMAGE MESSAGE VIA TWILIO");
    console.log("=".repeat(60));
    console.log(`From: ${from}`);
    console.log(`To: ${to}`);
    console.log(`Media URL: ${mediaUrl}`);
    console.log(`Caption: ${body || "(none)"}`);
    console.log("-".repeat(60));

    const messageParams: {
      from: string;
      to: string;
      mediaUrl: string[];
      body?: string;
    } = {
      from,
      to,
      mediaUrl: [mediaUrl],
    };

    if (body) {
      messageParams.body = body;
    }

    const message = await client.messages.create(messageParams);

    console.log("✅ TWILIO API RESPONSE:");
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   Direction: ${message.direction}`);
    console.log(`   Date Created: ${message.dateCreated}`);
    console.log(`   Error Code: ${message.errorCode || "none"}`);
    console.log(`   Error Message: ${message.errorMessage || "none"}`);
    console.log("=".repeat(60));

    return {
      success: true,
      messageId: message.sid,
      status: message.status,
    };
  } catch (error: any) {
    console.error("=".repeat(60));
    console.error("❌ TWILIO WHATSAPP IMAGE ERROR:");
    console.error(`   Error Code: ${error.code}`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   More Info: ${error.moreInfo || "N/A"}`);
    console.error("=".repeat(60));

    const errorMessage = error.code && ERROR_MESSAGES[error.code]
      ? ERROR_MESSAGES[error.code]
      : error.message || "Failed to send WhatsApp image message";

    return {
      success: false,
      error: errorMessage,
      errorCode: error.code,
      isTrialError: error.code && TRIAL_ERROR_CODES[error.code as keyof typeof TRIAL_ERROR_CODES] !== undefined,
    };
  }
}

/**
 * Get messaging settings from the database
 */
export async function getMessagingConfig(): Promise<TwilioConfig | null> {
  const settings = await prisma.messagingProviderSettings.findFirst();

  if (!settings) {
    return null;
  }

  return {
    accountSid: settings.smsApiKey || settings.whatsappApiKey || "",
    authToken: settings.smsApiSecret || settings.whatsappApiSecret || "",
    smsPhoneNumber: settings.smsPhoneNumber || undefined,
    whatsappPhoneNumber: settings.whatsappPhoneNumber || undefined,
  };
}

/**
 * Check if SMS is enabled and configured
 */
export async function isSmsEnabled(): Promise<boolean> {
  const settings = await prisma.messagingProviderSettings.findFirst();
  return (
    !!settings?.smsEnabled &&
    !!settings?.smsApiKey &&
    !!settings?.smsApiSecret &&
    !!settings?.smsPhoneNumber
  );
}

/**
 * Check if WhatsApp is enabled and configured
 */
export async function isWhatsAppEnabled(): Promise<boolean> {
  const settings = await prisma.messagingProviderSettings.findFirst();
  return (
    !!settings?.whatsappEnabled &&
    !!settings?.whatsappApiKey &&
    !!settings?.whatsappApiSecret &&
    !!settings?.whatsappPhoneNumber
  );
}

/**
 * Send a message to a guest using the appropriate channel
 * Falls back from WhatsApp to SMS if WhatsApp fails or is unavailable
 */
export async function sendMessage(
  guest: Guest,
  message: string,
  preferredChannel?: NotificationChannel
): Promise<NotificationResult> {
  const settings = await prisma.messagingProviderSettings.findFirst();

  if (!settings) {
    return {
      success: false,
      error: "Messaging not configured. Please configure messaging settings in admin.",
      status: NotificationStatus.FAILED,
      channel: NotificationChannel.WHATSAPP,
    };
  }

  // Determine which channel to use
  const whatsappAvailable =
    settings.whatsappEnabled &&
    settings.whatsappApiKey &&
    settings.whatsappApiSecret &&
    settings.whatsappPhoneNumber;

  const smsAvailable =
    settings.smsEnabled &&
    settings.smsApiKey &&
    settings.smsApiSecret &&
    settings.smsPhoneNumber;

  // Use guest's preferred channel or fall back to available options
  let channel: NotificationChannel;

  if (preferredChannel && preferredChannel === NotificationChannel.WHATSAPP && whatsappAvailable) {
    channel = NotificationChannel.WHATSAPP;
  } else if (preferredChannel && preferredChannel === NotificationChannel.SMS && smsAvailable) {
    channel = NotificationChannel.SMS;
  } else if (whatsappAvailable) {
    channel = NotificationChannel.WHATSAPP;
  } else if (smsAvailable) {
    channel = NotificationChannel.SMS;
  } else {
    return {
      success: false,
      error: "No messaging channels are enabled. Please enable WhatsApp or SMS in admin settings.",
      status: NotificationStatus.FAILED,
      channel: NotificationChannel.WHATSAPP,
    };
  }

  const rawPhoneNumber = guest.phoneNumber;

  if (!rawPhoneNumber) {
    return {
      success: false,
      error: "Guest does not have a phone number",
      status: NotificationStatus.FAILED,
      channel,
    };
  }

  // Format phone number to E.164 format (required by Twilio)
  // Default to Israel (IL) as the primary country
  const phoneNumber = formatToE164(rawPhoneNumber, "IL");
  console.log(`Phone number formatted: "${rawPhoneNumber}" -> "${phoneNumber}"`);

  // Create Twilio client
  // Note: For Twilio, accountSid is stored in apiKey field, authToken in apiSecret
  const accountSid = channel === NotificationChannel.WHATSAPP
    ? settings.whatsappApiKey!
    : settings.smsApiKey!;
  const authToken = channel === NotificationChannel.WHATSAPP
    ? settings.whatsappApiSecret!
    : settings.smsApiSecret!;
  const fromNumber = channel === NotificationChannel.WHATSAPP
    ? settings.whatsappPhoneNumber!
    : settings.smsPhoneNumber!;

  const client = createTwilioClient(accountSid, authToken);

  // Send the message
  let result;
  if (channel === NotificationChannel.WHATSAPP) {
    result = await sendWhatsApp(client, fromNumber, phoneNumber, message);
  } else {
    result = await sendSms(client, fromNumber, phoneNumber, message);
  }

  if (result.success) {
    return {
      success: true,
      status: NotificationStatus.SENT,
      channel,
      providerResponse: JSON.stringify({
        messageId: result.messageId,
        status: result.status,
      }),
    };
  }

  // If WhatsApp failed and SMS is available, try SMS as fallback
  if (channel === NotificationChannel.WHATSAPP && smsAvailable) {
    console.log("WhatsApp failed, falling back to SMS");

    const smsClient = createTwilioClient(settings.smsApiKey!, settings.smsApiSecret!);
    const smsResult = await sendSms(smsClient, settings.smsPhoneNumber!, phoneNumber, message);

    if (smsResult.success) {
      return {
        success: true,
        status: NotificationStatus.SENT,
        channel: NotificationChannel.SMS,
        providerResponse: JSON.stringify({
          messageId: smsResult.messageId,
          status: smsResult.status,
          fallbackFrom: "whatsapp",
        }),
      };
    }

    return {
      success: false,
      error: `WhatsApp failed: ${result.error}. SMS fallback also failed: ${smsResult.error}`,
      status: NotificationStatus.FAILED,
      channel: NotificationChannel.SMS,
    };
  }

  return {
    success: false,
    error: result.error,
    status: NotificationStatus.FAILED,
    channel,
  };
}
