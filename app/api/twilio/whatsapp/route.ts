import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";

import { prisma } from "@/lib/db";
import { RsvpStatus } from "@prisma/client";

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
  try {
    // Parse the form data from Twilio
    const formData = await request.formData();
    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    // Validate Twilio signature (optional but recommended for production)
    const settings = await prisma.messagingProviderSettings.findFirst();
    if (settings?.whatsappApiSecret) {
      const isValid = await validateTwilioSignature(request, settings.whatsappApiSecret, payload);
      if (!isValid) {
        console.warn("Invalid Twilio signature received");
        // In production, you might want to reject invalid signatures
        // return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
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
 * Guest is identified by phone number
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

  // Find the guest by phone number (try multiple formats)
  const guest = await prisma.guest.findFirst({
    where: {
      OR: phoneVariations.map(phone => ({ phoneNumber: phone })),
    },
    include: { rsvp: true, weddingEvent: true },
  });

  if (!guest) {
    console.error("Guest not found for phone number:", fromNumber, "- tried variations:", phoneVariations);
    return;
  }

  // Determine RSVP status based on action
  let rsvpStatus: RsvpStatus | null = null;
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
      // Keep as pending for "maybe" responses
      rsvpStatus = null;
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

  // Update RSVP status if applicable
  if (rsvpStatus) {
    if (guest.rsvp) {
      await prisma.guestRsvp.update({
        where: { id: guest.rsvp.id },
        data: {
          status: rsvpStatus,
          respondedAt: new Date(),
        },
      });
    } else {
      await prisma.guestRsvp.create({
        data: {
          guestId: guest.id,
          status: rsvpStatus,
          respondedAt: new Date(),
        },
      });
    }

    console.log(`RSVP updated via button: Guest ${guest.name} - ${rsvpStatus}`);
  }

  // If guest accepted, send guest count list picker
  if (shouldSendGuestCountList) {
    await sendGuestCountList(guest.id, rawPayload.From);
  }

  // If guest declined, send confirmation message immediately
  if (rsvpStatus === RsvpStatus.DECLINED) {
    await sendConfirmationMessage(guest.id, rawPayload.From, "DECLINED");
  }
}

/**
 * Handle list picker selection
 * List Item IDs: "1", "2", "3", ... "10" (for 10+)
 * Guest is identified by phone number
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

  // Find the guest by phone number (try multiple formats)
  const guest = await prisma.guest.findFirst({
    where: {
      OR: phoneVariations.map(phone => ({ phoneNumber: phone })),
    },
    include: { rsvp: true },
  });

  if (!guest) {
    console.error("Guest not found for phone number:", fromNumber, "- tried variations:", phoneVariations);
    return;
  }

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

  // Update guest count in RSVP
  if (guest.rsvp) {
    await prisma.guestRsvp.update({
      where: { id: guest.rsvp.id },
      data: {
        guestCount: guestCount,
      },
    });
  } else {
    // Create RSVP with the count (shouldn't normally happen, but handle it)
    await prisma.guestRsvp.create({
      data: {
        guestId: guest.id,
        status: RsvpStatus.ACCEPTED,
        guestCount: guestCount,
        respondedAt: new Date(),
      },
    });
  }

  console.log(`Guest count updated via list: Guest ${guest.name} - ${guestCount} guests`);

  // Send confirmation message after guest count is set
  await sendConfirmationMessage(guest.id, rawPayload.From, "ACCEPTED");
}

/**
 * Send guest count list picker to a guest
 */
async function sendGuestCountList(guestId: string, toNumber: string) {
  try {
    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings?.whatsappGuestCountListContentSid) {
      console.log("Guest count list template not configured, skipping");
      return;
    }

    // Get the active phone number
    const activePhone = await prisma.whatsAppPhoneNumber.findFirst({
      where: { isActive: true },
    });

    const fromNumber = activePhone?.phoneNumber || settings.whatsappPhoneNumber;

    if (!fromNumber || !settings.whatsappApiKey || !settings.whatsappApiSecret) {
      console.error("WhatsApp not properly configured");
      return;
    }

    // Send the guest count list via Twilio
    const twilio = require("twilio");
    const client = twilio(settings.whatsappApiKey, settings.whatsappApiSecret);

    // Build content variables with guest ID for callback
    const contentVariables = JSON.stringify({
      1: guestId, // Include guest ID in the list for callback parsing
    });

    await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`,
      contentSid: settings.whatsappGuestCountListContentSid,
      contentVariables: contentVariables,
    });

    console.log(`Guest count list sent to ${toNumber}`);

    // Log the notification
    const guest = await prisma.guest.findUnique({ where: { id: guestId } });
    if (guest) {
      await prisma.notificationLog.create({
        data: {
          guestId: guest.id,
          type: "GUEST_COUNT_REQUEST",
          channel: "WHATSAPP",
          status: "SENT",
          sentAt: new Date(),
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
  status: "ACCEPTED" | "DECLINED"
) {
  try {
    const settings = await prisma.messagingProviderSettings.findFirst();

    // Get the guest and their event
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { weddingEvent: true, rsvp: true },
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

    let message: string;
    if (status === "ACCEPTED") {
      message = `תודה ${guest.name}! 🎉\n\nאישור ההגעה שלך ל${event.title} התקבל בהצלחה.\n\n📅 תאריך: ${eventDate}\n📍 מיקום: ${event.location}\n👥 מספר אורחים: ${guestCount}\n\nמחכים לראותכם! 💕`;
    } else {
      message = `תודה ${guest.name} על התשובה.\n\nקיבלנו את ההודעה שלא תוכל/י להגיע ל${event.title}.\n\nמקווים לראותך באירוע אחר! 💕`;
    }

    // Send simple text message (no template needed - within 24h reply window)
    await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`,
      body: message,
    });

    console.log(`Confirmation message sent to ${toNumber} (${status})`);

    // Log the notification
    await prisma.notificationLog.create({
      data: {
        guestId: guest.id,
        type: "CONFIRMATION",
        channel: "WHATSAPP",
        status: "SENT",
        sentAt: new Date(),
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

// Also handle GET requests for Twilio webhook verification
export async function GET() {
  return NextResponse.json({ status: "Twilio WhatsApp webhook endpoint" });
}
