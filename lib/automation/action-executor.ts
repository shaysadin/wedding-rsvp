import { AutomationAction } from "@prisma/client";
import { AutomationContext, ExecutionResult } from "./types";
import { prisma } from "@/lib/db";

/**
 * Replace message variables with actual values
 */
function replaceMessageVariables(
  message: string,
  context: AutomationContext
): string {
  const dateFormatter = new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return message
    .replace(/\{guestName\}/g, context.guestName || "")
    .replace(/\{eventDate\}/g, dateFormatter.format(context.eventDate))
    .replace(/\{eventTime\}/g, context.eventTime || timeFormatter.format(context.eventDate))
    .replace(/\{venue\}/g, context.eventVenue || "")
    .replace(/\{address\}/g, context.eventAddress || context.eventLocation || "")
    .replace(/\{guestCount\}/g, context.guestCount?.toString() || "1")
    .replace(/\{tableName\}/g, context.tableName || "")
    .replace(/\{rsvpLink\}/g, context.rsvpLink || "");
}

/**
 * Execute an automation action
 */
export async function executeAction(
  action: AutomationAction,
  context: AutomationContext
): Promise<ExecutionResult> {
  switch (action) {
    // WhatsApp Template Actions
    case "SEND_WHATSAPP_INVITE":
      return sendWhatsAppWithTemplate(context, "whatsappInviteContentSid");

    case "SEND_WHATSAPP_REMINDER":
      return sendWhatsAppWithTemplate(context, "whatsappReminderContentSid");

    case "SEND_WHATSAPP_CONFIRMATION":
      return sendWhatsAppWithTemplate(context, "whatsappConfirmationContentSid");

    case "SEND_WHATSAPP_IMAGE_INVITE":
      return sendWhatsAppWithTemplate(context, "whatsappImageInviteContentSid");

    case "SEND_WHATSAPP_INTERACTIVE_INVITE":
      return sendWhatsAppWithTemplate(context, "whatsappInteractiveInviteContentSid");

    case "SEND_WHATSAPP_INTERACTIVE_REMINDER":
      return sendWhatsAppWithTemplate(context, "whatsappInteractiveReminderContentSid");

    case "SEND_WHATSAPP_GUEST_COUNT":
      return sendWhatsAppWithTemplate(context, "whatsappGuestCountListContentSid");

    case "SEND_TABLE_ASSIGNMENT":
      return sendTableAssignment(context);

    // Custom Message Actions
    case "SEND_CUSTOM_WHATSAPP":
      return sendCustomWhatsApp(context);

    case "SEND_CUSTOM_SMS":
      return sendCustomSms(context);

    // Legacy actions (backwards compatibility)
    case "SEND_WHATSAPP_TEMPLATE":
      return sendWhatsAppWithTemplate(context, "whatsappReminderContentSid");

    case "SEND_SMS_REMINDER":
      return sendSmsReminder(context);

    default:
      return {
        success: false,
        message: `Unknown action: ${action}`,
        errorCode: "UNKNOWN_ACTION",
      };
  }
}

/**
 * Send WhatsApp using a specific template
 */
async function sendWhatsAppWithTemplate(
  context: AutomationContext,
  templateField: string
): Promise<ExecutionResult> {
  const { guestId, guestName, guestPhone, weddingEventId } = context;

  if (!guestPhone) {
    return {
      success: false,
      message: "Guest has no phone number",
      errorCode: "NO_PHONE",
    };
  }

  try {
    // Get messaging provider settings
    const providerSettings = await prisma.messagingProviderSettings.findFirst();

    if (!providerSettings?.whatsappEnabled) {
      return {
        success: false,
        message: "WhatsApp messaging not enabled",
        errorCode: "WHATSAPP_DISABLED",
      };
    }

    // Get the template SID dynamically
    const templateSid = (providerSettings as any)[templateField];

    if (!templateSid) {
      return {
        success: false,
        message: `No WhatsApp template configured for ${templateField}`,
        errorCode: "NO_TEMPLATE",
      };
    }

    // Get event details for RSVP link
    const event = await prisma.weddingEvent.findUnique({
      where: { id: weddingEventId },
    });

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
    });

    if (!event || !guest) {
      return {
        success: false,
        message: "Event or guest not found",
        errorCode: "NOT_FOUND",
      };
    }

    // Build RSVP URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rsvp.app";
    const rsvpUrl = `${baseUrl}/rsvp/${guest.slug}`;

    // Send via Twilio
    const accountSid = providerSettings.smsApiKey;
    const authToken = providerSettings.smsApiSecret;
    const fromNumber = providerSettings.whatsappPhoneNumber;

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        message: "Twilio credentials not configured",
        errorCode: "NO_CREDENTIALS",
      };
    }

    const twilio = require("twilio")(accountSid, authToken);

    const message = await twilio.messages.create({
      contentSid: templateSid,
      contentVariables: JSON.stringify({
        1: guestName,
        2: rsvpUrl,
      }),
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${guestPhone}`,
    });

    // Log the notification
    await prisma.notificationLog.create({
      data: {
        guestId,
        type: "REMINDER",
        channel: "WHATSAPP",
        status: "SENT",
        sentAt: new Date(),
        providerResponse: message.sid,
      },
    });

    return {
      success: true,
      message: `WhatsApp sent: ${message.sid}`,
    };
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send WhatsApp",
      errorCode: "SEND_FAILED",
    };
  }
}

/**
 * Send custom WhatsApp message (using customMessage from context)
 */
async function sendCustomWhatsApp(
  context: AutomationContext
): Promise<ExecutionResult> {
  const { guestId, guestName, guestPhone, customMessage } = context;

  if (!guestPhone) {
    return {
      success: false,
      message: "Guest has no phone number",
      errorCode: "NO_PHONE",
    };
  }

  if (!customMessage) {
    return {
      success: false,
      message: "No custom message provided. Please add a message in the Message tab.",
      errorCode: "NO_MESSAGE",
    };
  }

  try {
    // Get messaging provider settings
    const providerSettings = await prisma.messagingProviderSettings.findFirst();

    if (!providerSettings?.whatsappEnabled) {
      return {
        success: false,
        message: "WhatsApp messaging not enabled",
        errorCode: "WHATSAPP_DISABLED",
      };
    }

    // Replace variables in the message
    const messageBody = replaceMessageVariables(customMessage, context);

    // Send via Twilio
    const accountSid = providerSettings.smsApiKey;
    const authToken = providerSettings.smsApiSecret;
    const fromNumber = providerSettings.whatsappPhoneNumber;

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        message: "Twilio credentials not configured",
        errorCode: "NO_CREDENTIALS",
      };
    }

    const twilio = require("twilio")(accountSid, authToken);

    // Note: Free-form WhatsApp messages only work within 24-hour session window
    // Outside the window, they will fail and need approved templates
    const message = await twilio.messages.create({
      body: messageBody,
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${guestPhone}`,
    });

    // Log the notification
    await prisma.notificationLog.create({
      data: {
        guestId,
        type: "REMINDER",
        channel: "WHATSAPP",
        status: "SENT",
        sentAt: new Date(),
        providerResponse: message.sid,
      },
    });

    return {
      success: true,
      message: `Custom WhatsApp sent: ${message.sid}`,
    };
  } catch (error) {
    console.error("Error sending custom WhatsApp:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send WhatsApp",
      errorCode: "SEND_FAILED",
    };
  }
}

/**
 * Send custom SMS message
 */
async function sendCustomSms(
  context: AutomationContext
): Promise<ExecutionResult> {
  const { guestId, guestPhone, customMessage } = context;

  if (!guestPhone) {
    return {
      success: false,
      message: "Guest has no phone number",
      errorCode: "NO_PHONE",
    };
  }

  if (!customMessage) {
    return {
      success: false,
      message: "No custom message provided. Please add a message in the Message tab.",
      errorCode: "NO_MESSAGE",
    };
  }

  try {
    // Get messaging provider settings
    const providerSettings = await prisma.messagingProviderSettings.findFirst();

    if (!providerSettings?.smsEnabled) {
      return {
        success: false,
        message: "SMS messaging not enabled",
        errorCode: "SMS_DISABLED",
      };
    }

    // Replace variables in the message
    const messageBody = replaceMessageVariables(customMessage, context);

    // Send via Twilio
    const accountSid = providerSettings.smsApiKey;
    const authToken = providerSettings.smsApiSecret;
    const fromNumber = providerSettings.smsPhoneNumber;
    const messagingServiceSid = providerSettings.smsMessagingServiceSid;

    if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
      return {
        success: false,
        message: "SMS credentials not configured",
        errorCode: "NO_CREDENTIALS",
      };
    }

    const twilio = require("twilio")(accountSid, authToken);

    const messageParams: any = {
      body: messageBody,
      to: guestPhone,
    };

    if (messagingServiceSid) {
      messageParams.messagingServiceSid = messagingServiceSid;
    } else {
      messageParams.from = fromNumber;
    }

    const message = await twilio.messages.create(messageParams);

    // Log the notification
    await prisma.notificationLog.create({
      data: {
        guestId,
        type: "REMINDER",
        channel: "SMS",
        status: "SENT",
        sentAt: new Date(),
        providerResponse: message.sid,
      },
    });

    return {
      success: true,
      message: `Custom SMS sent: ${message.sid}`,
    };
  } catch (error) {
    console.error("Error sending custom SMS:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send SMS",
      errorCode: "SEND_FAILED",
    };
  }
}

/**
 * Send SMS reminder (legacy)
 */
async function sendSmsReminder(
  context: AutomationContext
): Promise<ExecutionResult> {
  const { guestId, guestName, guestPhone, weddingEventId, eventDate, eventLocation } = context;

  if (!guestPhone) {
    return {
      success: false,
      message: "Guest has no phone number",
      errorCode: "NO_PHONE",
    };
  }

  try {
    // Get messaging provider settings
    const providerSettings = await prisma.messagingProviderSettings.findFirst();

    if (!providerSettings?.smsEnabled) {
      return {
        success: false,
        message: "SMS messaging not enabled",
        errorCode: "SMS_DISABLED",
      };
    }

    // Get event for SMS sender ID
    const event = await prisma.weddingEvent.findUnique({
      where: { id: weddingEventId },
    });

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
    });

    if (!event || !guest) {
      return {
        success: false,
        message: "Event or guest not found",
        errorCode: "NOT_FOUND",
      };
    }

    // Build RSVP URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rsvp.app";
    const rsvpUrl = `${baseUrl}/rsvp/${guest.slug}`;

    // Format date for Hebrew
    const dateFormatter = new Intl.DateTimeFormat("he-IL", {
      day: "numeric",
      month: "long",
    });
    const formattedDate = dateFormatter.format(eventDate);

    // Build message
    const message = `שלום ${guestName}, תזכורת לאירוע ב${formattedDate}. לאישור הגעה: ${rsvpUrl}`;

    // Send via Twilio
    const accountSid = providerSettings.smsApiKey;
    const authToken = providerSettings.smsApiSecret;
    const messagingServiceSid = providerSettings.smsMessagingServiceSid;

    if (!accountSid || !authToken || !messagingServiceSid) {
      return {
        success: false,
        message: "SMS credentials not configured",
        errorCode: "NO_CREDENTIALS",
      };
    }

    const twilio = require("twilio")(accountSid, authToken);

    const smsMessage = await twilio.messages.create({
      body: message,
      messagingServiceSid,
      to: guestPhone,
    });

    // Log the notification
    await prisma.notificationLog.create({
      data: {
        guestId,
        type: "REMINDER",
        channel: "SMS",
        status: "SENT",
        sentAt: new Date(),
        providerResponse: smsMessage.sid,
      },
    });

    return {
      success: true,
      message: `SMS sent: ${smsMessage.sid}`,
    };
  } catch (error) {
    console.error("Error sending SMS:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send SMS",
      errorCode: "SEND_FAILED",
    };
  }
}

/**
 * Send table assignment with location details
 */
async function sendTableAssignment(
  context: AutomationContext
): Promise<ExecutionResult> {
  const {
    guestId,
    guestName,
    guestPhone,
    weddingEventId,
    tableName,
    eventLocation,
    eventVenue,
    customMessage,
  } = context;

  if (!guestPhone) {
    return {
      success: false,
      message: "Guest has no phone number",
      errorCode: "NO_PHONE",
    };
  }

  try {
    // Get messaging provider settings
    const providerSettings = await prisma.messagingProviderSettings.findFirst();

    if (!providerSettings?.whatsappEnabled) {
      return {
        success: false,
        message: "WhatsApp messaging not enabled",
        errorCode: "WHATSAPP_DISABLED",
      };
    }

    // Get event with RSVP settings for Google Maps URL
    const event = await prisma.weddingEvent.findUnique({
      where: { id: weddingEventId },
      include: {
        rsvpPageSettings: true,
      },
    });

    if (!event) {
      return {
        success: false,
        message: "Event not found",
        errorCode: "NOT_FOUND",
      };
    }

    // Build message content (use custom if provided, otherwise default)
    let messageBody: string;

    if (customMessage) {
      messageBody = replaceMessageVariables(customMessage, context);
    } else {
      messageBody = `שלום ${guestName}! 🎉\n\n`;
      messageBody += `מזכירים שאנחנו מחכים לכם היום!\n\n`;

      if (tableName) {
        messageBody += `🪑 השולחן שלכם: ${tableName}\n\n`;
      }

      messageBody += `📍 מיקום: ${eventVenue || eventLocation}\n`;

      // Add Google Maps link if available
      const mapsUrl = event.rsvpPageSettings?.googleMapsUrl;
      if (mapsUrl) {
        messageBody += `🗺️ קישור לניווט: ${mapsUrl}\n`;
      }

      // Add Waze link if available
      const wazeUrl = event.rsvpPageSettings?.wazeUrl;
      if (wazeUrl) {
        messageBody += `🚗 Waze: ${wazeUrl}\n`;
      }

      messageBody += `\nנתראה! 💕`;
    }

    // Send via Twilio WhatsApp
    const accountSid = providerSettings.smsApiKey;
    const authToken = providerSettings.smsApiSecret;
    const fromNumber = providerSettings.whatsappPhoneNumber;

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        message: "Twilio credentials not configured",
        errorCode: "NO_CREDENTIALS",
      };
    }

    const twilio = require("twilio")(accountSid, authToken);

    const message = await twilio.messages.create({
      body: messageBody,
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${guestPhone}`,
    });

    // Log the notification
    await prisma.notificationLog.create({
      data: {
        guestId,
        type: "CONFIRMATION",
        channel: "WHATSAPP",
        status: "SENT",
        sentAt: new Date(),
        providerResponse: message.sid,
      },
    });

    return {
      success: true,
      message: `Table assignment sent: ${message.sid}`,
    };
  } catch (error) {
    console.error("Error sending table assignment:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send table assignment",
      errorCode: "SEND_FAILED",
    };
  }
}
