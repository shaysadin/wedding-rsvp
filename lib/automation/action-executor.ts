import { AutomationAction, WhatsAppTemplateType, NotificationType } from "@prisma/client";
import { AutomationContext, ExecutionResult } from "./types";
import { prisma } from "@/lib/db";
import { onNotificationSent } from "./event-handlers";
import { ALL_WHATSAPP_TEMPLATE_DEFINITIONS } from "@/config/whatsapp-templates";
import { logWhatsAppCost, logSmsCost } from "@/lib/analytics/usage-tracking";

/**
 * Helper to log message cost in automation flows
 */
async function logAutomationCost(
  weddingEventId: string,
  guestId: string,
  channel: "WHATSAPP" | "SMS",
  notificationType: NotificationType
): Promise<void> {
  try {
    // Get ownerId from event
    const event = await prisma.weddingEvent.findUnique({
      where: { id: weddingEventId },
      select: { ownerId: true },
    });

    if (!event) return;

    // Log cost based on channel
    if (channel === "WHATSAPP") {
      await logWhatsAppCost(event.ownerId, weddingEventId, guestId, {
        notificationType,
        source: "automation",
      });
    } else if (channel === "SMS") {
      // Get SMS provider setting
      const settings = await prisma.messagingProviderSettings.findFirst();
      const smsProvider = (settings?.smsProvider as "twilio" | "upsend") || "twilio";

      await logSmsCost(event.ownerId, weddingEventId, guestId, smsProvider, {
        notificationType,
        source: "automation",
      });
    }
  } catch (error) {
    // Log error but don't fail the automation
    console.error("Error logging automation cost:", error);
  }
}

/**
 * Map automation action to notification type for logging
 */
function getNotificationType(action: AutomationAction): NotificationType {
  switch (action) {
    case "SEND_WHATSAPP_INVITE":
    case "SEND_WHATSAPP_IMAGE_INVITE":
    case "SEND_WHATSAPP_INTERACTIVE_INVITE":
      return NotificationType.INVITE;
    case "SEND_WHATSAPP_REMINDER":
    case "SEND_WHATSAPP_INTERACTIVE_REMINDER":
    case "SEND_SMS_REMINDER":
    case "SEND_WHATSAPP_TEMPLATE":
      return NotificationType.REMINDER;
    case "SEND_WHATSAPP_CONFIRMATION":
      return NotificationType.CONFIRMATION;
    case "SEND_WHATSAPP_EVENT_DAY":
      return NotificationType.EVENT_DAY;
    case "SEND_WHATSAPP_THANK_YOU":
      return NotificationType.THANK_YOU;
    case "SEND_TABLE_ASSIGNMENT":
      return NotificationType.TABLE_ASSIGNMENT;
    case "SEND_WHATSAPP_GUEST_COUNT":
      return NotificationType.GUEST_COUNT_REQUEST;
    case "SEND_CUSTOM_WHATSAPP":
    case "SEND_CUSTOM_SMS":
      return NotificationType.REMINDER; // Default for custom messages
    default:
      return NotificationType.REMINDER; // Safe fallback
  }
}

/**
 * Map automation action to WhatsApp template type
 */
function getWhatsAppTemplateType(action: AutomationAction): WhatsAppTemplateType | null {
  switch (action) {
    case "SEND_WHATSAPP_INVITE":
      return WhatsAppTemplateType.INVITE;
    case "SEND_WHATSAPP_REMINDER":
      return WhatsAppTemplateType.REMINDER;
    case "SEND_WHATSAPP_IMAGE_INVITE":
      return WhatsAppTemplateType.IMAGE_INVITE;
    case "SEND_WHATSAPP_INTERACTIVE_INVITE":
      return WhatsAppTemplateType.INTERACTIVE_INVITE;
    case "SEND_WHATSAPP_INTERACTIVE_REMINDER":
      return WhatsAppTemplateType.INTERACTIVE_REMINDER;
    case "SEND_WHATSAPP_CONFIRMATION":
      return WhatsAppTemplateType.CONFIRMATION;
    case "SEND_WHATSAPP_EVENT_DAY":
      return WhatsAppTemplateType.EVENT_DAY;
    case "SEND_WHATSAPP_THANK_YOU":
      return WhatsAppTemplateType.THANK_YOU;
    case "SEND_TABLE_ASSIGNMENT":
      return WhatsAppTemplateType.TABLE_ASSIGNMENT;
    case "SEND_WHATSAPP_GUEST_COUNT":
      return WhatsAppTemplateType.GUEST_COUNT_LIST;
    default:
      return null;
  }
}

/**
 * Get WhatsApp template Content SID from database or config fallback
 */
async function getWhatsAppTemplateSid(
  templateType: WhatsAppTemplateType,
  style: string = "formal",
  settingsField: string,
  providerSettings: any
): Promise<string | null> {
  // First, try to get from database
  const dbTemplate = await prisma.whatsAppTemplate.findFirst({
    where: {
      type: templateType,
      style: style,
      isActive: true,
    },
  });

  if (dbTemplate?.contentSid) {
    console.log(`Using DB template: ${templateType} ${style} -> ${dbTemplate.contentSid}`);
    return dbTemplate.contentSid;
  }

  // Second, check config for existing Content SIDs (pre-approved templates)
  const configTemplate = ALL_WHATSAPP_TEMPLATE_DEFINITIONS.find(
    (def) => def.type === templateType && def.style === style && def.existingContentSid
  );

  if (configTemplate?.existingContentSid) {
    console.log(`Using config template: ${templateType} ${style} -> ${configTemplate.existingContentSid}`);
    return configTemplate.existingContentSid;
  }

  // Third, fall back to legacy settings field
  const legacySid = providerSettings?.[settingsField];
  if (legacySid) {
    console.log(`Using legacy settings: ${settingsField} -> ${legacySid}`);
    return legacySid;
  }

  return null;
}

/**
 * Format phone number to international format (E.164)
 * Handles Israeli local numbers (05xxxxxxxx) -> +9725xxxxxxxx
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // If already has + prefix and looks valid, return as-is
  if (cleaned.startsWith("+") && cleaned.length >= 10) {
    return cleaned;
  }

  // Remove leading + if present for processing
  cleaned = cleaned.replace(/^\+/, "");

  // Israeli mobile numbers: 05xxxxxxxx (10 digits)
  if (cleaned.startsWith("05") && cleaned.length === 10) {
    return `+972${cleaned.substring(1)}`;
  }

  // Israeli numbers starting with 0 (other formats)
  if (cleaned.startsWith("0") && cleaned.length >= 9 && cleaned.length <= 10) {
    return `+972${cleaned.substring(1)}`;
  }

  // If starts with 972, add +
  if (cleaned.startsWith("972") && cleaned.length >= 12) {
    return `+${cleaned}`;
  }

  // Default: add + prefix
  return `+${cleaned}`;
}

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
    // WhatsApp Template Actions - now with template style support
    case "SEND_WHATSAPP_INVITE":
      return sendWhatsAppWithTemplate(context, "whatsappInviteContentSid", action);

    case "SEND_WHATSAPP_REMINDER":
      return sendWhatsAppWithTemplate(context, "whatsappReminderContentSid", action);

    case "SEND_WHATSAPP_CONFIRMATION":
      return sendWhatsAppWithTemplate(context, "whatsappConfirmationContentSid");

    case "SEND_WHATSAPP_IMAGE_INVITE":
      return sendWhatsAppWithTemplate(context, "whatsappImageInviteContentSid", action);

    case "SEND_WHATSAPP_INTERACTIVE_INVITE":
      return sendWhatsAppWithTemplate(context, "whatsappInteractiveInviteContentSid", action);

    case "SEND_WHATSAPP_INTERACTIVE_REMINDER":
      return sendWhatsAppWithTemplate(context, "whatsappInteractiveReminderContentSid", action);

    case "SEND_WHATSAPP_GUEST_COUNT":
      return sendWhatsAppWithTemplate(context, "whatsappGuestCountListContentSid");

    case "SEND_TABLE_ASSIGNMENT":
      return sendTableAssignment(context);

    // Event Day & Thank You Actions
    case "SEND_WHATSAPP_EVENT_DAY":
      return sendEventDayReminder(context);

    case "SEND_WHATSAPP_THANK_YOU":
      return sendThankYouMessage(context);

    // Custom Message Actions
    case "SEND_CUSTOM_WHATSAPP":
      return sendCustomWhatsApp(context);

    case "SEND_CUSTOM_SMS":
      return sendCustomSms(context);

    // Legacy actions (backwards compatibility)
    case "SEND_WHATSAPP_TEMPLATE":
      return sendWhatsAppWithTemplate(context, "whatsappReminderContentSid", "SEND_WHATSAPP_REMINDER");

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
 *
 * For standard templates (invite, reminder, confirmation, etc.):
 *   - {{1}} = guest name
 *   - {{2}} = event title
 *   - {{3}} = RSVP link
 *
 * For interactive templates (with image/buttons):
 *   - {{1}} = guest name
 *   - {{2}} = event title
 *   - {{3}} = Cloudinary image path (stripped of base URL)
 *   - RSVP link comes from button action, not a variable
 */
async function sendWhatsAppWithTemplate(
  context: AutomationContext,
  templateField: string,
  action?: AutomationAction
): Promise<ExecutionResult> {
  const { guestId, guestName, guestPhone, weddingEventId, templateStyle } = context;

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

    // Determine template SID - try new system first, then fall back to legacy
    let templateSid: string | null = null;

    // If we have an action type, try to get template from DB/config
    if (action) {
      const templateType = getWhatsAppTemplateType(action);
      if (templateType) {
        templateSid = await getWhatsAppTemplateSid(
          templateType,
          templateStyle || "formal",
          templateField,
          providerSettings
        );
      }
    }

    // Fall back to legacy settings field if no template found
    if (!templateSid) {
      templateSid = (providerSettings as any)[templateField];
    }

    if (!templateSid) {
      return {
        success: false,
        message: `No WhatsApp template configured for ${templateField}`,
        errorCode: "NO_TEMPLATE",
      };
    }

    // Get event details
    const event = await prisma.weddingEvent.findUnique({
      where: { id: weddingEventId },
    });

    if (!event) {
      return {
        success: false,
        message: "Event not found",
        errorCode: "NOT_FOUND",
      };
    }

    // For test mode, use context values; otherwise fetch guest
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rsvp.app";
    let rsvpUrl: string;

    if (guestId.startsWith("test-")) {
      // Test mode - use provided context values
      rsvpUrl = context.rsvpLink || `${baseUrl}/rsvp/test-preview`;
    } else {
      const guest = await prisma.guest.findUnique({
        where: { id: guestId },
      });

      if (!guest) {
        return {
          success: false,
          message: "Guest not found",
          errorCode: "NOT_FOUND",
        };
      }
      rsvpUrl = `${baseUrl}/rsvp/${guest.slug}`;
    }

    // Send via Twilio - use WhatsApp credentials
    const accountSid = providerSettings.whatsappApiKey;
    const authToken = providerSettings.whatsappApiSecret;
    const fromNumber = providerSettings.whatsappPhoneNumber;

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        message: "WhatsApp credentials not configured",
        errorCode: "NO_CREDENTIALS",
      };
    }

    const twilio = require("twilio")(accountSid, authToken);
    const formattedPhone = formatPhoneNumber(guestPhone);

    // Check if this is an interactive template (with image)
    // Interactive templates expect {{3}} to be the Cloudinary image path, not RSVP link
    const isInteractiveTemplate =
      templateField === "whatsappInteractiveInviteContentSid" ||
      templateField === "whatsappInteractiveReminderContentSid" ||
      templateField === "whatsappImageInviteContentSid";

    // Build content variables based on template type
    const contentVariables: Record<string, string> = {
      "1": guestName,           // {{1}} = guest name
      "2": event.title,         // {{2}} = event title
    };

    if (isInteractiveTemplate) {
      // For interactive/image templates, {{3}} is the Cloudinary image path
      // The template has format: https://res.cloudinary.com/{{3}}
      // So we need to strip the base URL from the invitation image
      if (event.invitationImageUrl) {
        // Strip Cloudinary base URL to get just the path
        const imagePath = event.invitationImageUrl.replace("https://res.cloudinary.com/", "");
        contentVariables["3"] = imagePath;
      } else {
        // No image configured - this will likely fail on Twilio's side
        // but we let it through so the error message is clear
        console.warn("Interactive template requested but no invitation image URL configured for event");
        return {
          success: false,
          message: "No invitation image configured for this event. Please upload an invitation image first.",
          errorCode: "NO_IMAGE",
        };
      }
    } else {
      // For standard templates, {{3}} is the RSVP link
      contentVariables["3"] = rsvpUrl;
    }

    const message = await twilio.messages.create({
      contentSid: templateSid,
      contentVariables: JSON.stringify(contentVariables),
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${formattedPhone}`,
    });

    // Log the notification (skip for test guests)
    if (!guestId.startsWith("test-")) {
      const sentAt = new Date();
      const notificationType = action ? getNotificationType(action) : NotificationType.REMINDER;

      await prisma.notificationLog.create({
        data: {
          guestId,
          type: notificationType,
          channel: "WHATSAPP",
          status: "SENT",
          sentAt,
          providerResponse: message.sid,
        },
      });

      // Log cost for this message
      await logAutomationCost(weddingEventId, guestId, "WHATSAPP", notificationType);

      // Trigger NO_RESPONSE automation scheduling for this new notification
      // This ensures that if guest doesn't respond to this reminder, they get another follow-up
      await onNotificationSent({
        guestId,
        weddingEventId,
        notificationType: notificationType as string,
        sentAt,
      });
    }

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

    // Send via Twilio WhatsApp
    const accountSid = providerSettings.whatsappApiKey;
    const authToken = providerSettings.whatsappApiSecret;
    const fromNumber = providerSettings.whatsappPhoneNumber;

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        message: "WhatsApp credentials not configured. Please configure them in Admin > Messaging Settings.",
        errorCode: "NO_CREDENTIALS",
      };
    }

    if (!accountSid.startsWith("AC")) {
      return {
        success: false,
        message: "Invalid Twilio Account SID for WhatsApp. It must start with 'AC'. Please check Admin > Messaging Settings.",
        errorCode: "INVALID_CREDENTIALS",
      };
    }

    const twilio = require("twilio")(accountSid, authToken);

    // Note: Free-form WhatsApp messages only work within 24-hour session window
    // Outside the window, they will fail and need approved templates
    const formattedPhone = formatPhoneNumber(guestPhone);
    const message = await twilio.messages.create({
      body: messageBody,
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${formattedPhone}`,
    });

    // Log the notification (skip for test guests)
    if (!guestId.startsWith("test-")) {
      const sentAt = new Date();
      const notificationType = NotificationType.REMINDER; // Custom WhatsApp = REMINDER

      await prisma.notificationLog.create({
        data: {
          guestId,
          type: notificationType,
          channel: "WHATSAPP",
          status: "SENT",
          sentAt,
          providerResponse: message.sid,
        },
      });

      // Log cost for this message
      await logAutomationCost(context.weddingEventId, guestId, "WHATSAPP", notificationType);

      // Trigger NO_RESPONSE automation scheduling for this new notification
      if (context.weddingEventId) {
        await onNotificationSent({
          guestId,
          weddingEventId: context.weddingEventId,
          notificationType: notificationType as string,
          sentAt,
        });
      }
    }

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
        message: "SMS credentials not configured. Please configure them in Admin > Messaging Settings.",
        errorCode: "NO_CREDENTIALS",
      };
    }

    if (!accountSid.startsWith("AC")) {
      return {
        success: false,
        message: "Invalid Twilio Account SID. It must start with 'AC'. Please check Admin > Messaging Settings.",
        errorCode: "INVALID_CREDENTIALS",
      };
    }

    const twilio = require("twilio")(accountSid, authToken);

    const formattedPhone = formatPhoneNumber(guestPhone);
    const messageParams: any = {
      body: messageBody,
      to: formattedPhone,
    };

    if (messagingServiceSid) {
      messageParams.messagingServiceSid = messagingServiceSid;
    } else {
      messageParams.from = fromNumber;
    }

    const message = await twilio.messages.create(messageParams);

    // Log the notification (skip for test guests)
    if (!guestId.startsWith("test-")) {
      const sentAt = new Date();
      const notificationType = NotificationType.REMINDER; // Custom SMS = REMINDER

      await prisma.notificationLog.create({
        data: {
          guestId,
          type: notificationType,
          channel: "SMS",
          status: "SENT",
          sentAt,
          providerResponse: message.sid,
        },
      });

      // Log cost for this message
      await logAutomationCost(context.weddingEventId, guestId, "SMS", notificationType);

      // Trigger NO_RESPONSE automation scheduling for this new notification
      if (context.weddingEventId) {
        await onNotificationSent({
          guestId,
          weddingEventId: context.weddingEventId,
          notificationType: notificationType as string,
          sentAt,
        });
      }
    }

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
        message: "SMS credentials not configured. Please configure them in Admin > Messaging Settings.",
        errorCode: "NO_CREDENTIALS",
      };
    }

    if (!accountSid.startsWith("AC")) {
      return {
        success: false,
        message: "Invalid Twilio Account SID. It must start with 'AC'. Please check Admin > Messaging Settings.",
        errorCode: "INVALID_CREDENTIALS",
      };
    }

    const twilio = require("twilio")(accountSid, authToken);

    const formattedPhone = formatPhoneNumber(guestPhone);
    const smsMessage = await twilio.messages.create({
      body: message,
      messagingServiceSid,
      to: formattedPhone,
    });

    // Log the notification (skip for test guests)
    if (!guestId.startsWith("test-")) {
      const sentAt = new Date();
      await prisma.notificationLog.create({
        data: {
          guestId,
          type: "REMINDER",
          channel: "SMS",
          status: "SENT",
          sentAt,
          providerResponse: smsMessage.sid,
        },
      });

      // Log cost for this message
      await logAutomationCost(weddingEventId, guestId, "SMS", NotificationType.REMINDER);

      // Trigger NO_RESPONSE automation scheduling for this new notification
      await onNotificationSent({
        guestId,
        weddingEventId,
        notificationType: "REMINDER",
        sentAt,
      });
    }

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
    templateStyle,
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

    // Send via Twilio WhatsApp
    const accountSid = providerSettings.whatsappApiKey;
    const authToken = providerSettings.whatsappApiSecret;
    const fromNumber = providerSettings.whatsappPhoneNumber;

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        message: "WhatsApp credentials not configured. Please configure them in Admin > Messaging Settings.",
        errorCode: "NO_CREDENTIALS",
      };
    }

    if (!accountSid.startsWith("AC")) {
      return {
        success: false,
        message: "Invalid Twilio Account SID for WhatsApp. It must start with 'AC'. Please check Admin > Messaging Settings.",
        errorCode: "INVALID_CREDENTIALS",
      };
    }

    const twilio = require("twilio")(accountSid, authToken);
    const formattedPhone = formatPhoneNumber(guestPhone);

    // Try to get template SID for table assignment
    const templateSid = await getWhatsAppTemplateSid(
      WhatsAppTemplateType.TABLE_ASSIGNMENT,
      templateStyle || "formal",
      "whatsappTableAssignmentContentSid", // Legacy field (may not exist yet)
      providerSettings
    );

    let message;

    if (templateSid) {
      // Use Twilio Content Template
      message = await twilio.messages.create({
        contentSid: templateSid,
        contentVariables: JSON.stringify({
          "1": guestName,
          "2": event.title,
          "3": tableName || "טרם שובץ",
        }),
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${formattedPhone}`,
      });
    } else {
      // Fallback to freeform message
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

      message = await twilio.messages.create({
        body: messageBody,
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${formattedPhone}`,
      });
    }

    // Log the notification (skip for test guests)
    if (!guestId.startsWith("test-")) {
      await prisma.notificationLog.create({
        data: {
          guestId,
          type: "TABLE_ASSIGNMENT",
          channel: "WHATSAPP",
          status: "SENT",
          sentAt: new Date(),
          providerResponse: message.sid,
        },
      });

      // Log cost for this message
      await logAutomationCost(weddingEventId, guestId, "WHATSAPP", NotificationType.TABLE_ASSIGNMENT);
    }

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

/**
 * Send Event Day reminder with table, address, navigation, and gift link
 * Uses WhatsApp template with variables
 */
async function sendEventDayReminder(
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
    templateStyle,
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

    // Get template SID from new template system (DB -> config -> legacy)
    const templateSid = await getWhatsAppTemplateSid(
      WhatsAppTemplateType.EVENT_DAY,
      templateStyle || "formal",
      "whatsappEventDayContentSid",
      providerSettings
    );

    if (!templateSid) {
      return {
        success: false,
        message: "Event Day WhatsApp template not configured. Please configure it in Admin > Messaging Settings.",
        errorCode: "NO_TEMPLATE",
      };
    }

    // Get event with RSVP settings and guest info
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

    // Get guest for table assignment and slug (for per-guest gift link)
    let guestTableName = tableName;
    let guestSlug: string | null = null;

    if (!guestId.startsWith("test-")) {
      const guest = await prisma.guest.findUnique({
        where: { id: guestId },
        include: {
          tableAssignment: {
            include: {
              table: true,
            },
          },
        },
      });
      if (!guestTableName) {
        guestTableName = guest?.tableAssignment?.table?.name || null;
      }
      guestSlug = guest?.slug || null;
    } else {
      // For test mode, use a test slug
      guestSlug = "test-preview";
    }

    // Build navigation URL - always use Waze with address
    let navigationUrl = "";
    const addressForNav = event.location || event.venue || eventLocation || eventVenue;
    if (addressForNav) {
      // Encode the address for Waze URL
      const encodedAddress = encodeURIComponent(addressForNav);
      navigationUrl = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
    }

    // Build gift link - check for external provider first
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rsvp.app";
    let giftLink = "";

    // Check gift settings
    const giftSettings = await prisma.giftPaymentSettings.findUnique({
      where: { weddingEventId: weddingEventId },
    });

    console.log("[Event Day Reminder] Gift settings:", {
      isEnabled: giftSettings?.isEnabled,
      useExternalProvider: giftSettings?.useExternalProvider,
      externalProviderUrl: giftSettings?.externalProviderUrl,
    });

    if (giftSettings?.isEnabled) {
      // If external provider is configured and enabled, use that URL
      if (giftSettings.useExternalProvider && giftSettings.externalProviderUrl) {
        giftLink = giftSettings.externalProviderUrl;
        console.log("[Event Day Reminder] Using external gift link:", giftLink);
      } else if (guestSlug) {
        // Otherwise use our internal gift system with per-guest link
        giftLink = `${baseUrl}/gift/${guestSlug}`;
        console.log("[Event Day Reminder] Using internal gift link:", giftLink);
      }
    }

    // Build venue/address display - combine venue + location with comma
    // Example: "מאגיה, רחוב החשמל 5, טבריה"
    let venueAddressDisplay = "";
    if (event.venue && event.location) {
      venueAddressDisplay = `${event.venue}, ${event.location}`;
    } else if (eventVenue && eventLocation) {
      venueAddressDisplay = `${eventVenue}, ${eventLocation}`;
    } else {
      venueAddressDisplay = eventVenue || event.venue || eventLocation || event.location || "המקום";
    }

    // Send via Twilio WhatsApp with template
    const accountSid = providerSettings.whatsappApiKey;
    const authToken = providerSettings.whatsappApiSecret;
    const fromNumber = providerSettings.whatsappPhoneNumber;

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        message: "WhatsApp credentials not configured. Please configure them in Admin > Messaging Settings.",
        errorCode: "NO_CREDENTIALS",
      };
    }

    if (!accountSid.startsWith("AC")) {
      return {
        success: false,
        message: "Invalid Twilio Account SID for WhatsApp. It must start with 'AC'. Please check Admin > Messaging Settings.",
        errorCode: "INVALID_CREDENTIALS",
      };
    }

    const twilio = require("twilio")(accountSid, authToken);

    const formattedPhone = formatPhoneNumber(guestPhone);

    // Template variables for Event Day:
    // {{1}} = guest name
    // {{2}} = wedding/event name
    // {{3}} = table name (e.g., "שולחן 5" or "טרם שובץ")
    // {{4}} = venue/address (e.g., "מאגיה, רחוב החשמל 5, טבריה")
    // {{5}} = navigation link
    // {{6}} = gift link
    const message = await twilio.messages.create({
      contentSid: templateSid,
      contentVariables: JSON.stringify({
        "1": guestName,
        "2": event.title,
        "3": guestTableName || "טרם שובץ",
        "4": venueAddressDisplay,
        "5": navigationUrl || "",
        "6": giftLink || "",
      }),
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${formattedPhone}`,
    });

    // Log the notification (skip for test guests)
    if (!guestId.startsWith("test-")) {
      await prisma.notificationLog.create({
        data: {
          guestId,
          type: "EVENT_DAY",
          channel: "WHATSAPP",
          status: "SENT",
          sentAt: new Date(),
          providerResponse: message.sid,
        },
      });

      // Log cost for this message
      await logAutomationCost(weddingEventId, guestId, "WHATSAPP", NotificationType.EVENT_DAY);
    }

    return {
      success: true,
      message: `Event day reminder sent: ${message.sid}`,
    };
  } catch (error) {
    console.error("Error sending event day reminder:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send event day reminder",
      errorCode: "SEND_FAILED",
    };
  }
}

/**
 * Send Thank You message from the couple (day after event)
 * Uses WhatsApp template
 */
async function sendThankYouMessage(
  context: AutomationContext
): Promise<ExecutionResult> {
  const {
    guestId,
    guestName,
    guestPhone,
    weddingEventId,
    templateStyle,
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

    // Get template SID from new template system (DB -> config -> legacy)
    const templateSid = await getWhatsAppTemplateSid(
      WhatsAppTemplateType.THANK_YOU,
      templateStyle || "formal",
      "whatsappThankYouContentSid",
      providerSettings
    );

    if (!templateSid) {
      return {
        success: false,
        message: "Thank You WhatsApp template not configured. Please configure it in Admin > Messaging Settings.",
        errorCode: "NO_TEMPLATE",
      };
    }

    // Get event for couple names
    const event = await prisma.weddingEvent.findUnique({
      where: { id: weddingEventId },
    });

    if (!event) {
      return {
        success: false,
        message: "Event not found",
        errorCode: "NOT_FOUND",
      };
    }

    // Build couple name display
    const coupleName = context.coupleName || event.title || "החתן והכלה";

    // Send via Twilio WhatsApp with template
    const accountSid = providerSettings.whatsappApiKey;
    const authToken = providerSettings.whatsappApiSecret;
    const fromNumber = providerSettings.whatsappPhoneNumber;

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        message: "WhatsApp credentials not configured. Please configure them in Admin > Messaging Settings.",
        errorCode: "NO_CREDENTIALS",
      };
    }

    if (!accountSid.startsWith("AC")) {
      return {
        success: false,
        message: "Invalid Twilio Account SID for WhatsApp. It must start with 'AC'. Please check Admin > Messaging Settings.",
        errorCode: "INVALID_CREDENTIALS",
      };
    }

    const twilio = require("twilio")(accountSid, authToken);

    const formattedPhone = formatPhoneNumber(guestPhone);

    // Template variables for Thank You:
    // {{1}} = guest name
    // {{2}} = couple name / event title
    const message = await twilio.messages.create({
      contentSid: templateSid,
      contentVariables: JSON.stringify({
        "1": guestName,
        "2": coupleName,
      }),
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${formattedPhone}`,
    });

    // Log the notification (skip for test guests)
    if (!guestId.startsWith("test-")) {
      await prisma.notificationLog.create({
        data: {
          guestId,
          type: "THANK_YOU",
          channel: "WHATSAPP",
          status: "SENT",
          sentAt: new Date(),
          providerResponse: message.sid,
        },
      });

      // Log cost for this message
      await logAutomationCost(weddingEventId, guestId, "WHATSAPP", NotificationType.THANK_YOU);
    }

    return {
      success: true,
      message: `Thank you message sent: ${message.sid}`,
    };
  } catch (error) {
    console.error("Error sending thank you message:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send thank you message",
      errorCode: "SEND_FAILED",
    };
  }
}
