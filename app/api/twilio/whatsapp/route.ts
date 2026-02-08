import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";

import { prisma } from "@/lib/db";
import { RsvpStatus } from "@prisma/client";
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { twilioWhatsAppWebhookSchema } from "@/lib/validations/webhooks";

/**
 * Build phone number variations for database lookup
 * Handles different formats: +972584003578, 972584003578, 0584003578, 584003578
 */
function buildPhoneVariations(phone: string): string[] {
  const variations: string[] = [];

  // Clean the phone number
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Add original
  variations.push(cleaned);

  // Without + prefix
  if (cleaned.startsWith("+")) {
    const withoutPlus = cleaned.substring(1);
    variations.push(withoutPlus);

    // Convert Israeli international to local format (+972... -> 0...)
    if (withoutPlus.startsWith("972")) {
      const localNumber = "0" + withoutPlus.substring(3);
      variations.push(localNumber);
      // Also without leading zero
      variations.push(withoutPlus.substring(3));
    }
  } else if (cleaned.startsWith("972")) {
    // Without country code prefix, add + version
    variations.push("+" + cleaned);
    // Local format
    const localNumber = "0" + cleaned.substring(3);
    variations.push(localNumber);
    variations.push(cleaned.substring(3));
  } else if (cleaned.startsWith("0")) {
    // Local format - convert to international
    const withoutZero = cleaned.substring(1);
    variations.push(withoutZero);
    variations.push("972" + withoutZero);
    variations.push("+972" + withoutZero);
  } else {
    // Just the number - try all formats
    variations.push("0" + cleaned);
    variations.push("972" + cleaned);
    variations.push("+972" + cleaned);
  }

  // Remove duplicates
  return [...new Set(variations)];
}

/**
 * Twilio WhatsApp Webhook Handler
 * Receives interactive button and list responses from WhatsApp
 */
export async function POST(request: NextRequest) {
  // Rate limit webhook requests
  const rateLimitResult = withRateLimit(request, RATE_LIMIT_PRESETS.webhook);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Parse the form data from Twilio
    const formData = await request.formData();
    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    // Validate payload schema
    const validation = twilioWhatsAppWebhookSchema.safeParse(payload);
    if (!validation.success) {
      console.error("Invalid Twilio WhatsApp webhook payload:", validation.error);
      return NextResponse.json(
        { error: "Invalid webhook payload", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Validate Twilio signature (REQUIRED for security)
    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings?.whatsappApiSecret) {
      console.error("Twilio webhook received but auth token not configured");
      return NextResponse.json(
        { error: "Webhook authentication not configured" },
        { status: 503 }
      );
    }

    const isValid = await validateTwilioSignature(request, settings.whatsappApiSecret, payload);
    if (!isValid) {
      console.error("Invalid Twilio signature received - possible unauthorized access attempt");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Log the raw payload for debugging
    console.log("Twilio WhatsApp webhook received:", JSON.stringify(payload, null, 2));

    // Check for button response
    const buttonPayload = payload.ButtonPayload;
    if (buttonPayload) {
      await handleButtonResponse(buttonPayload, payload);
      return NextResponse.json({ received: true });
    }

    // Check for list selection response
    const listId = payload.ListId;
    if (listId) {
      await handleListResponse(listId, payload);
      return NextResponse.json({ received: true });
    }

    // Regular message (not interactive) - log and ignore
    console.log("Non-interactive WhatsApp message received:", payload.Body);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Twilio WhatsApp webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Validate Twilio request signature
 */
async function validateTwilioSignature(
  request: NextRequest,
  authToken: string,
  params: Record<string, string>
): Promise<boolean> {
  try {
    const headersList = await headers();
    const twilioSignature = headersList.get("x-twilio-signature");

    if (!twilioSignature) {
      return false;
    }

    // Build the URL from the request
    const url = request.url;

    // Sort parameters and concatenate
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], "");

    const signatureBase = url + sortedParams;

    // Create HMAC-SHA1 signature
    const expectedSignature = crypto
      .createHmac("sha1", authToken)
      .update(signatureBase, "utf-8")
      .digest("base64");

    return twilioSignature === expectedSignature;
  } catch (error) {
    console.error("Error validating Twilio signature:", error);
    return false;
  }
}

/**
 * Handle button click response
 * Button IDs: "accept", "decline", "maybe"
 * Guest is identified by the original message SID (the message the user is responding to)
 */
async function handleButtonResponse(
  buttonPayload: string,
  rawPayload: Record<string, string>
) {
  // Button payload is just the action (accept, decline, maybe)
  const action = buttonPayload.toLowerCase();

  if (!["accept", "decline", "maybe"].includes(action)) {
    console.error("Unknown button action:", buttonPayload);
    return;
  }

  // Get guest phone number from the From field
  const fromNumber = rawPayload.From?.replace("whatsapp:", "") || "";
  if (!fromNumber) {
    console.error("No phone number in webhook payload");
    return;
  }

  // Build multiple phone number format variations for lookup
  const phoneVariations = buildPhoneVariations(fromNumber);
  console.log("Looking up guest with phone variations:", phoneVariations);

  // Get the original message SID that the user is responding to
  // Twilio sends this as OriginalRepliedMessageSid when responding to interactive messages
  const originalMessageSid = rawPayload.OriginalRepliedMessageSid;
  console.log("Original message SID:", originalMessageSid);

  // Method 1: Find by original message SID (most accurate)
  let guest: Awaited<ReturnType<typeof prisma.guest.findFirst<{ include: { rsvp: true; weddingEvent: true } }>>> = null;

  if (originalMessageSid) {
    // Look up the notification log that has this message SID in providerResponse
    // Include both SENT and DELIVERED statuses because the status callback may have already updated the status
    const notificationByMessageSid = await prisma.notificationLog.findFirst({
      where: {
        type: { in: ["INTERACTIVE_INVITE", "INTERACTIVE_REMINDER"] },
        status: { in: ["SENT", "DELIVERED"] },
        providerResponse: { contains: originalMessageSid },
      },
      include: {
        guest: {
          include: { rsvp: true, weddingEvent: true },
        },
      },
    });

    if (notificationByMessageSid?.guest) {
      guest = notificationByMessageSid.guest;
      console.log(`Found guest by message SID: ${guest.name} for event: ${guest.weddingEvent?.title}`);
    }
  }

  // Method 2: Fallback - find the most recent interactive message sent to this phone
  if (!guest) {
    console.log("Message SID lookup failed, falling back to recent notification lookup");
    const recentNotification = await prisma.notificationLog.findFirst({
      where: {
        type: { in: ["INTERACTIVE_INVITE", "INTERACTIVE_REMINDER"] },
        status: { in: ["SENT", "DELIVERED"] },
        guest: {
          OR: phoneVariations.map(phone => ({ phoneNumber: phone })),
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        guest: {
          include: { rsvp: true, weddingEvent: true },
        },
      },
    });
    guest = recentNotification?.guest ?? null;
  }

  // Method 3: Last resort - direct guest lookup (for backwards compatibility)
  if (!guest) {
    console.log("No notification found, falling back to direct guest lookup");
    guest = await prisma.guest.findFirst({
      where: {
        OR: phoneVariations.map(phone => ({ phoneNumber: phone })),
      },
      include: { rsvp: true, weddingEvent: true },
    });
  }

  if (!guest) {
    console.error("Guest not found for phone number:", fromNumber, "- tried variations:", phoneVariations);
    return;
  }

  console.log(`Found guest: ${guest.name} for event: ${guest.weddingEvent?.title}`);

  // Determine RSVP status based on action
  let rsvpStatus: RsvpStatus;
  let shouldSendGuestCountList = false;

  switch (action.toLowerCase()) {
    case "accept":
      rsvpStatus = RsvpStatus.ACCEPTED;
      shouldSendGuestCountList = true;
      break;
    case "decline":
      rsvpStatus = RsvpStatus.DECLINED;
      break;
    case "maybe":
      rsvpStatus = RsvpStatus.MAYBE;
      break;
    default:
      console.error("Unknown button action:", action);
      return;
  }

  // Log the response
  await prisma.whatsAppButtonResponse.create({
    data: {
      guestId: guest.id,
      responseType: "button",
      buttonId: action,
      buttonTitle: getButtonTitle(action),
      rsvpStatusSet: rsvpStatus,
      rawPayload: rawPayload,
      processedAt: new Date(),
    },
  });

  // Update RSVP status (using upsert for atomic operation)
  await prisma.guestRsvp.upsert({
    where: { guestId: guest.id },
    create: {
      guestId: guest.id,
      status: rsvpStatus,
      respondedAt: new Date(),
    },
    update: {
      status: rsvpStatus,
      respondedAt: new Date(),
    },
  });

  console.log(`RSVP updated via button: Guest ${guest.name} - ${rsvpStatus}`);

  // If guest accepted, send guest count list picker
  if (shouldSendGuestCountList) {
    await sendGuestCountList(guest.id, rawPayload.From);
  }

  // If guest declined, send confirmation message immediately
  if (rsvpStatus === RsvpStatus.DECLINED) {
    await sendConfirmationMessage(guest.id, rawPayload.From, "DECLINED");
  }

  // If guest said maybe, send confirmation and schedule follow-up reminder
  if (rsvpStatus === RsvpStatus.MAYBE) {
    await sendConfirmationMessage(guest.id, rawPayload.From, "MAYBE");
    // Schedule a follow-up reminder for the next day via automation
    await scheduleRsvpMaybeFollowUp(guest.id, guest.weddingEventId);
  }
}

/**
 * Handle list picker selection
 * List Item IDs: "1", "2", "3", ... "10" (for 10+)
 * Guest is identified by the original message SID (the message the user is responding to)
 */
async function handleListResponse(
  listId: string,
  rawPayload: Record<string, string>
) {
  // Parse the guest count from list selection (ID is just the number)
  const guestCount = parseInt(listId, 10);

  if (isNaN(guestCount) || guestCount < 1) {
    console.error("Invalid guest count from list:", listId);
    return;
  }

  // Get guest phone number from the From field
  const fromNumber = rawPayload.From?.replace("whatsapp:", "") || "";
  if (!fromNumber) {
    console.error("No phone number in webhook payload");
    return;
  }

  // Build multiple phone number format variations for lookup
  const phoneVariations = buildPhoneVariations(fromNumber);

  // Get the original message SID that the user is responding to
  const originalMessageSid = rawPayload.OriginalRepliedMessageSid;
  console.log("Original message SID for list response:", originalMessageSid);

  // Method 1: Find by original message SID (most accurate)
  let guest: Awaited<ReturnType<typeof prisma.guest.findFirst<{ include: { rsvp: true; weddingEvent: true } }>>> = null;

  if (originalMessageSid) {
    // Include both SENT and DELIVERED statuses because the status callback may have already updated the status
    const notificationByMessageSid = await prisma.notificationLog.findFirst({
      where: {
        type: { in: ["INTERACTIVE_INVITE", "INTERACTIVE_REMINDER", "GUEST_COUNT_REQUEST"] },
        status: { in: ["SENT", "DELIVERED"] },
        providerResponse: { contains: originalMessageSid },
      },
      include: {
        guest: {
          include: { rsvp: true, weddingEvent: true },
        },
      },
    });

    if (notificationByMessageSid?.guest) {
      guest = notificationByMessageSid.guest;
      console.log(`Found guest by message SID: ${guest.name} for event: ${guest.weddingEvent?.title}`);
    }
  }

  // Method 2: Fallback - find the most recent interactive/count request sent to this phone
  if (!guest) {
    console.log("Message SID lookup failed, falling back to recent notification lookup");
    const recentNotification = await prisma.notificationLog.findFirst({
      where: {
        type: { in: ["INTERACTIVE_INVITE", "INTERACTIVE_REMINDER", "GUEST_COUNT_REQUEST"] },
        status: { in: ["SENT", "DELIVERED"] },
        guest: {
          OR: phoneVariations.map(phone => ({ phoneNumber: phone })),
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        guest: {
          include: { rsvp: true, weddingEvent: true },
        },
      },
    });
    guest = recentNotification?.guest ?? null;
  }

  // Method 3: Last resort - direct guest lookup
  if (!guest) {
    console.log("No notification found, falling back to direct guest lookup");
    guest = await prisma.guest.findFirst({
      where: {
        OR: phoneVariations.map(phone => ({ phoneNumber: phone })),
      },
      include: { rsvp: true, weddingEvent: true },
    });
  }

  if (!guest) {
    console.error("Guest not found for phone number:", fromNumber, "- tried variations:", phoneVariations);
    return;
  }

  console.log(`Found guest for count update: ${guest.name} for event: ${guest.weddingEvent?.title}`);

  // Log the response
  await prisma.whatsAppButtonResponse.create({
    data: {
      guestId: guest.id,
      responseType: "list",
      buttonId: `count:${guestCount}`,
      buttonTitle: `${guestCount} guests`,
      guestCountSet: guestCount,
      rawPayload: rawPayload,
      processedAt: new Date(),
    },
  });

  // Update guest count in RSVP (using upsert for atomic operation)
  await prisma.guestRsvp.upsert({
    where: { guestId: guest.id },
    create: {
      guestId: guest.id,
      status: RsvpStatus.ACCEPTED,
      guestCount: guestCount,
      respondedAt: new Date(),
    },
    update: {
      guestCount: guestCount,
    },
  });

  console.log(`Guest count updated via list: Guest ${guest.name} - ${guestCount} guests`);

  // Send confirmation message after guest count is set
  await sendConfirmationMessage(guest.id, rawPayload.From, "ACCEPTED");
}

/**
 * Send guest count request to a guest
 * Uses CUSTOM LIST-PICKER content (free-form within 24-hour window - saves costs!)
 *
 * This uses a custom Twilio Content API resource with type "twilio/list-picker"
 * which is NOT a WhatsApp-approved template, so it's cheaper than marketing templates.
 *
 * Since this is sent within 24 hours of the guest's reply, we can use free-form
 * interactive messages without needing WhatsApp template approval.
 *
 * Setup: Create the list-picker content using scripts/create-guest-count-list-picker.js
 * and configure the ContentSid in MessagingProviderSettings.whatsappGuestCountListContentSid
 */
async function sendGuestCountList(guestId: string, toNumber: string) {
  try {
    const settings = await prisma.messagingProviderSettings.findFirst();

    // Get the active phone number
    const activePhone = await prisma.whatsAppPhoneNumber.findFirst({
      where: { isActive: true },
    });

    const fromNumber = activePhone?.phoneNumber || settings?.whatsappPhoneNumber;

    if (!fromNumber || !settings?.whatsappApiKey || !settings?.whatsappApiSecret) {
      console.error("WhatsApp not properly configured");
      return;
    }

    if (!settings?.whatsappGuestCountListContentSid) {
      console.error("Guest count list-picker ContentSid not configured. Run scripts/create-guest-count-list-picker.js");
      return;
    }

    // Get guest info for personalized message
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { weddingEvent: true },
    });

    if (!guest) {
      console.error("Guest not found:", guestId);
      return;
    }

    // Send the guest count request using custom list-picker content
    const twilio = require("twilio");
    const client = twilio(settings.whatsappApiKey, settings.whatsappApiSecret);

    // Use custom list-picker content (NOT a WhatsApp-approved template)
    // This is cheaper because it's free-form content within the 24-hour window
    const response = await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`,
      contentSid: settings.whatsappGuestCountListContentSid,
      contentVariables: JSON.stringify({
        "1": guest.name || "אורח יקר",
        "2": guest.weddingEvent.title,
      }),
    });

    console.log(`List-picker guest count request sent to ${toNumber}: ${response.sid} (custom content - lower cost!)`);

    // Log the notification WITH the message SID for proper guest lookup on response
    if (guest) {
      await prisma.notificationLog.create({
        data: {
          guestId: guest.id,
          type: "GUEST_COUNT_REQUEST",
          channel: "WHATSAPP",
          status: "SENT",
          sentAt: new Date(),
          // CRITICAL: Store the message SID so we can find the correct guest when they respond
          providerResponse: JSON.stringify({
            messageId: response.sid,
            status: response.status,
            customContent: true, // Mark as custom content (not WhatsApp-approved template)
          }),
        },
      });
    }
  } catch (error) {
    console.error("Error sending guest count list:", error);
  }
}

/**
 * Send confirmation message after RSVP flow is complete
 * Uses simple text message (no template needed since user already replied within 24h window)
 */
async function sendConfirmationMessage(
  guestId: string,
  toNumber: string,
  status: "ACCEPTED" | "DECLINED" | "MAYBE"
) {
  try {
    const settings = await prisma.messagingProviderSettings.findFirst();

    // Get the guest and their event (with transportation registration check)
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        transportationSlug: true,
        lastInvitationTemplateSid: true,
        weddingEvent: true,
        rsvp: true,
        transportationRegistration: true,
      },
    });

    if (!guest || !guest.weddingEvent) {
      console.error("Guest or event not found for confirmation");
      return;
    }

    // Get the active phone number
    const activePhone = await prisma.whatsAppPhoneNumber.findFirst({
      where: { isActive: true },
    });

    const fromNumber = activePhone?.phoneNumber || settings?.whatsappPhoneNumber;

    if (!fromNumber || !settings?.whatsappApiKey || !settings?.whatsappApiSecret) {
      console.error("WhatsApp not properly configured");
      return;
    }

    // Send the confirmation via Twilio
    const twilio = require("twilio");
    const client = twilio(settings.whatsappApiKey, settings.whatsappApiSecret);

    // Build the confirmation message based on status
    const event = guest.weddingEvent;
    const eventDate = event.dateTime.toLocaleDateString("he-IL");
    const guestCount = guest.rsvp?.guestCount || 1;

    // Build location string with venue if available
    const locationString = event.venue
      ? `${event.venue}, ${event.location}`
      : event.location;

    // Debug logging
    console.log("=== CONFIRMATION MESSAGE DEBUG ===");
    console.log("Event ID:", event.id);
    console.log("Status:", status);
    console.log("Custom rsvpConfirmedMessage:", event.rsvpConfirmedMessage);
    console.log("Custom rsvpDeclinedMessage:", event.rsvpDeclinedMessage);
    console.log("Custom rsvpMaybeMessage:", event.rsvpMaybeMessage);
    console.log("===================================");

    // Helper to replace placeholders in custom messages
    const replacePlaceholders = (text: string) => {
      return text
        .replace(/\{guestName\}/g, guest.name)
        .replace(/\{name\}/g, guest.name)
        .replace(/\{eventTitle\}/g, event.title)
        .replace(/\{eventDate\}/g, eventDate)
        .replace(/\{address\}/g, locationString)
        .replace(/\{location\}/g, locationString)
        .replace(/\{venue\}/g, event.venue || event.location)
        .replace(/\{guestCount\}/g, String(guestCount));
    };

    // Check if the guest received a TRANSPORTATION_INVITE template
    let receivedTransportationTemplate = false;
    if (guest.lastInvitationTemplateSid) {
      const template = await prisma.whatsAppTemplate.findFirst({
        where: { contentSid: guest.lastInvitationTemplateSid },
        select: { type: true },
      });
      receivedTransportationTemplate = template?.type === "TRANSPORTATION_INVITE";
    }

    let message: string;
    if (status === "ACCEPTED") {
      if (event.rsvpConfirmedMessage) {
        console.log("Using custom ACCEPTED message");
        message = replacePlaceholders(event.rsvpConfirmedMessage);
      } else {
        console.log("Using default ACCEPTED message");
        message = `תודה ${guest.name}! 🎉\n\nאישור ההגעה שלך ל${event.title} התקבל בהצלחה.\n\n📅 תאריך: ${eventDate}\n📍 מיקום: ${locationString}\n👥 מספר אורחים: ${guestCount}\n\nמחכים לראותכם! 💕`;
      }

      // Add transportation reminder ONLY if they received a transportation template
      // AND haven't registered yet AND have a transportation slug
      if (receivedTransportationTemplate && guest.transportationSlug && !guest.transportationRegistration) {
        const transportationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/transportation/${guest.transportationSlug}`;
        const transportationReminder = `\n\n🚌 תזכורת: נשמח לארגן עבורכם הסעות לאירוע!\nלהרשמה להסעות לחצו כאן: ${transportationUrl}`;
        message = message + transportationReminder;
      }
    } else if (status === "DECLINED") {
      if (event.rsvpDeclinedMessage) {
        console.log("Using custom DECLINED message");
        message = replacePlaceholders(event.rsvpDeclinedMessage);
      } else {
        console.log("Using default DECLINED message");
        message = `תודה ${guest.name} על התשובה.\n\nקיבלנו את ההודעה שלא תוכל/י להגיע ל${event.title}.\n\nמקווים לראותך באירוע אחר! 💕`;
      }
    } else {
      // MAYBE status
      if (event.rsvpMaybeMessage) {
        console.log("Using custom MAYBE message");
        message = replacePlaceholders(event.rsvpMaybeMessage);
      } else {
        console.log("Using default MAYBE message");
        message = `תודה ${guest.name} על התשובה! 🤔\n\nהבנו שעדיין לא בטוח/ה לגבי ההגעה ל${event.title}.\n\n📅 תאריך: ${eventDate}\n📍 מיקום: ${locationString}\n\nניצור איתך קשר שוב בקרוב לבדוק אם החלטת. 💕`;
      }
    }

    console.log("Final message to send:", message);
    console.log("===================================");

    // Send simple text message (no template needed - within 24h reply window)
    const response = await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`,
      body: message,
    });

    console.log(`Confirmation message sent to ${toNumber} (${status}): ${response.sid}`);

    // Log the notification with message SID for delivery tracking
    await prisma.notificationLog.create({
      data: {
        guestId: guest.id,
        type: "CONFIRMATION",
        channel: "WHATSAPP",
        status: "SENT",
        sentAt: new Date(),
        providerResponse: JSON.stringify({
          messageId: response.sid,
          status: response.status,
        }),
      },
    });
  } catch (error) {
    console.error("Error sending confirmation message:", error);
  }
}

/**
 * Get display title for button action
 */
function getButtonTitle(action: string): string {
  switch (action.toLowerCase()) {
    case "accept":
      return "Yes, I'll attend";
    case "decline":
      return "No, I won't attend";
    case "maybe":
      return "Don't know yet";
    default:
      return action;
  }
}

/**
 * Schedule a follow-up reminder for guests who said "maybe"
 * Creates an automation execution to send a reminder based on the event's configured delay
 */
async function scheduleRsvpMaybeFollowUp(guestId: string, eventId: string) {
  try {
    // Get the event's configured reminder delay
    const event = await prisma.weddingEvent.findUnique({
      where: { id: eventId },
      select: { rsvpMaybeReminderDelay: true },
    });

    const configuredDelay = event?.rsvpMaybeReminderDelay || 24;

    // Find or create the default RSVP_MAYBE automation flow for this event
    let automationFlow = await prisma.automationFlow.findFirst({
      where: {
        weddingEventId: eventId,
        trigger: "RSVP_MAYBE",
        status: { in: ["ACTIVE", "DRAFT"] },
      },
    });

    // If no automation exists, create a default one with the configured delay
    if (!automationFlow) {
      automationFlow = await prisma.automationFlow.create({
        data: {
          weddingEventId: eventId,
          name: "Maybe Follow-up Reminder",
          trigger: "RSVP_MAYBE",
          action: "SEND_WHATSAPP_INTERACTIVE_REMINDER",
          delayHours: configuredDelay,
          status: "ACTIVE",
        },
      });
      console.log(`Created default RSVP_MAYBE automation for event ${eventId} with ${configuredDelay}h delay`);
    }

    // Use the event's configured delay (not the flow's delay, which might be outdated)
    const scheduledFor = new Date();
    scheduledFor.setHours(scheduledFor.getHours() + configuredDelay);

    // Check if an execution already exists for this guest/flow combination
    const existingExecution = await prisma.automationFlowExecution.findUnique({
      where: {
        flowId_guestId: {
          flowId: automationFlow.id,
          guestId: guestId,
        },
      },
    });

    if (existingExecution) {
      // Update existing execution to reschedule
      await prisma.automationFlowExecution.update({
        where: { id: existingExecution.id },
        data: {
          status: "PENDING",
          scheduledFor: scheduledFor,
          retryCount: 0,
          errorMessage: null,
        },
      });
      console.log(`Rescheduled RSVP_MAYBE follow-up for guest ${guestId} at ${scheduledFor.toISOString()} (${configuredDelay}h delay)`);
    } else {
      // Create new execution
      await prisma.automationFlowExecution.create({
        data: {
          flowId: automationFlow.id,
          guestId: guestId,
          status: "PENDING",
          scheduledFor: scheduledFor,
        },
      });
      console.log(`Scheduled RSVP_MAYBE follow-up for guest ${guestId} at ${scheduledFor.toISOString()} (${configuredDelay}h delay)`);
    }
  } catch (error) {
    console.error("Error scheduling RSVP_MAYBE follow-up:", error);
  }
}

// Also handle GET requests for Twilio webhook verification
export async function GET() {
  return NextResponse.json({ status: "Twilio WhatsApp webhook endpoint" });
}
