import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";

import { prisma } from "@/lib/db";
import { NotificationStatus } from "@prisma/client";

/**
 * Twilio Message Status Callback Webhook
 *
 * Receives status updates for sent messages (delivered, undelivered, failed, etc.)
 * Reference: https://www.twilio.com/docs/messaging/guides/track-outbound-message-status
 *
 * Twilio status progression:
 * - queued → sending → sent → delivered (success)
 * - queued → sending → sent → undelivered (delivery failed)
 * - queued → failed (send failed)
 */

// Map Twilio error codes to human-readable messages
const ERROR_CODE_MESSAGES: Record<number, { en: string; he: string }> = {
  // WhatsApp-specific errors
  63001: { en: "WhatsApp sender not registered", he: "השולח לא רשום בוואטסאפ" },
  63003: { en: "Recipient not opted in to WhatsApp", he: "הנמען לא נתן הסכמה לוואטסאפ" },
  63007: { en: "Outside 24-hour session window", he: "מחוץ לחלון 24 שעות" },
  63016: { en: "Rate limited by WhatsApp", he: "הגבלת קצב מוואטסאפ" },
  63018: { en: "Template not approved by WhatsApp", he: "תבנית לא מאושרת בוואטסאפ" },
  63024: { en: "Invalid message recipient", he: "מספר טלפון לא תקין" },
  63049: { en: "Marketing message rejected by Meta", he: "הודעת שיווק נדחתה על ידי מטא" },
  63050: { en: "Marketing message rejected - engagement issue", he: "הודעת שיווק נדחתה - בעיית מעורבות" },

  // SMS errors
  21211: { en: "Invalid phone number format", he: "פורמט מספר טלפון לא תקין" },
  21217: { en: "Invalid phone number", he: "מספר טלפון לא תקין" },
  21608: { en: "Unverified recipient (trial account)", he: "נמען לא מאומת (חשבון ניסיון)" },
  21610: { en: "Recipient opted out", he: "הנמען ביקש להפסיק לקבל הודעות" },
  21614: { en: "Not a valid mobile number", he: "לא מספר נייד תקין" },

  // General errors
  30001: { en: "Queue overflow", he: "עומס בתור" },
  30002: { en: "Account suspended", he: "חשבון מושעה" },
  30003: { en: "Unreachable destination", he: "יעד לא נגיש" },
  30004: { en: "Message blocked", he: "הודעה חסומה" },
  30005: { en: "Unknown destination", he: "יעד לא ידוע" },
  30006: { en: "Landline or unreachable carrier", he: "קו נייח או ספק לא נגיש" },
  30007: { en: "Message filtered as spam", he: "הודעה סוננה כספאם" },
  30008: { en: "Unknown error", he: "שגיאה לא ידועה" },
};

/**
 * Get human-readable error message for an error code
 */
function getErrorMessage(errorCode: number | null, errorMessage: string | null): string {
  if (!errorCode) return errorMessage || "Unknown error";

  const knownError = ERROR_CODE_MESSAGES[errorCode];
  if (knownError) {
    return knownError.en; // Store English in DB, translate in UI
  }

  return errorMessage || `Error code ${errorCode}`;
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

export async function POST(request: NextRequest) {
  try {
    // Parse the form data from Twilio
    const formData = await request.formData();
    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    // Log the payload for debugging
    console.log("📬 Twilio Status Callback received:", JSON.stringify(payload, null, 2));

    // Validate Twilio signature (optional but recommended)
    const settings = await prisma.messagingProviderSettings.findFirst();
    if (settings?.whatsappApiSecret) {
      const isValid = await validateTwilioSignature(request, settings.whatsappApiSecret, payload);
      if (!isValid) {
        console.warn("Invalid Twilio signature received for status callback");
        // In production, you might want to reject invalid signatures
        // return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // Extract key fields from the payload
    const messageSid = payload.MessageSid;
    const messageStatus = payload.MessageStatus?.toLowerCase();
    const errorCode = payload.ErrorCode ? parseInt(payload.ErrorCode, 10) : null;
    const errorMessage = payload.ErrorMessage || null;

    if (!messageSid) {
      console.error("No MessageSid in status callback");
      return NextResponse.json({ error: "Missing MessageSid" }, { status: 400 });
    }

    console.log(`Status update for ${messageSid}: ${messageStatus} (error: ${errorCode || "none"})`);

    // Find the notification log by message SID
    // The messageId is stored in providerResponse JSON
    const notificationLog = await prisma.notificationLog.findFirst({
      where: {
        providerResponse: { contains: messageSid },
      },
    });

    if (!notificationLog) {
      console.log(`No notification log found for MessageSid: ${messageSid}`);
      // Return 200 to prevent Twilio from retrying
      return NextResponse.json({ received: true, found: false });
    }

    // Determine the new status based on Twilio status
    let newStatus: NotificationStatus | null = null;
    let deliveredAt: Date | null = null;

    switch (messageStatus) {
      case "delivered":
        newStatus = NotificationStatus.DELIVERED;
        deliveredAt = new Date();
        break;
      case "undelivered":
        newStatus = NotificationStatus.UNDELIVERED;
        break;
      case "failed":
        newStatus = NotificationStatus.FAILED;
        break;
      case "queued":
      case "sending":
      case "sent":
        // These are intermediate statuses - keep as SENT
        // Only update twilioStatus field
        break;
      case "read":
        // WhatsApp read receipt - keep as DELIVERED, could add a READ status in future
        newStatus = NotificationStatus.DELIVERED;
        break;
      default:
        console.log(`Unknown message status: ${messageStatus}`);
    }

    // Build the update data
    const updateData: {
      twilioStatus: string;
      errorCode?: number;
      errorMessage?: string;
      status?: NotificationStatus;
      deliveredAt?: Date;
    } = {
      twilioStatus: messageStatus || "unknown",
    };

    if (errorCode) {
      updateData.errorCode = errorCode;
      updateData.errorMessage = getErrorMessage(errorCode, errorMessage);
    }

    if (newStatus) {
      updateData.status = newStatus;
    }

    if (deliveredAt) {
      updateData.deliveredAt = deliveredAt;
    }

    // Update the notification log
    await prisma.notificationLog.update({
      where: { id: notificationLog.id },
      data: updateData,
    });

    console.log(`✅ Updated notification log ${notificationLog.id}: status=${newStatus || "unchanged"}, twilioStatus=${messageStatus}`);

    return NextResponse.json({ received: true, updated: true });
  } catch (error) {
    console.error("Error processing Twilio status callback:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Also handle GET requests for verification
export async function GET() {
  return NextResponse.json({ status: "Twilio status callback endpoint" });
}
