/**
 * Real Notification Service
 *
 * This service implements the NotificationService interface using Twilio
 * for both SMS and WhatsApp.
 *
 * References:
 * - Twilio SMS: https://www.twilio.com/docs/messaging/tutorials/how-to-send-sms-messages
 * - WhatsApp: https://www.twilio.com/docs/whatsapp/quickstart
 */

import { Guest, WeddingEvent, NotificationChannel, NotificationStatus } from "@prisma/client";
import { env } from "@/env.mjs";
import { prisma } from "@/lib/db";
import {
  NotificationService,
  NotificationResult,
  hebrewTemplates,
  englishTemplates,
} from "./types";
// Note: hebrewTemplates and englishTemplates are still used for sendConfirmation
import {
  createTwilioClient,
  sendWhatsApp,
} from "./twilio-service";
import { formatToE164 } from "./phone-formatter";
import { renderMessage } from "./template-renderer";
import { createSmsProvider } from "./sms-providers";

export class TwilioNotificationService implements NotificationService {
  private async getSettings() {
    return prisma.messagingProviderSettings.findFirst();
  }

  private getChannel(guest: Guest): NotificationChannel {
    // Priority: WhatsApp > SMS > Email
    if (guest.phoneNumber) {
      return "WHATSAPP";
    }
    if (guest.email) {
      return "EMAIL";
    }
    return "SMS";
  }

  private getRsvpLink(guestSlug: string): string {
    return `${env.NEXT_PUBLIC_APP_URL}/rsvp/${guestSlug}`;
  }

  private async sendMessage(
    guest: Guest,
    message: string,
    preferredChannel?: NotificationChannel,
    alphaSenderId?: string | null,
    whatsappOptions?: {
      contentSid?: string;
      contentVariables?: Record<string, string>;
    }
  ): Promise<NotificationResult> {
    const settings = await this.getSettings();

    if (!settings) {
      return {
        success: false,
        error: "Messaging not configured",
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

    // Choose channel
    let channel: NotificationChannel;
    if (preferredChannel === NotificationChannel.WHATSAPP && whatsappAvailable) {
      channel = NotificationChannel.WHATSAPP;
    } else if (preferredChannel === NotificationChannel.SMS && smsAvailable) {
      channel = NotificationChannel.SMS;
    } else if (whatsappAvailable) {
      channel = NotificationChannel.WHATSAPP;
    } else if (smsAvailable) {
      channel = NotificationChannel.SMS;
    } else {
      return {
        success: false,
        error: "No messaging channels enabled",
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

    // Create Twilio client and send
    const accountSid = channel === NotificationChannel.WHATSAPP
      ? settings.whatsappApiKey!
      : settings.smsApiKey!;
    const authToken = channel === NotificationChannel.WHATSAPP
      ? settings.whatsappApiSecret!
      : settings.smsApiSecret!;
    const fromNumber = channel === NotificationChannel.WHATSAPP
      ? settings.whatsappPhoneNumber!
      : settings.smsPhoneNumber!;

    let result;
    if (channel === NotificationChannel.WHATSAPP) {
      // WhatsApp always uses Twilio
      const client = createTwilioClient(accountSid, authToken);
      result = await sendWhatsApp(client, fromNumber, phoneNumber, message, whatsappOptions);
    } else {
      // SMS uses Twilio
      const smsProvider = createSmsProvider({
        provider: "twilio",
        authId: accountSid,
        authToken: authToken,
        phoneNumber: fromNumber,
        messagingServiceSid: settings.smsMessagingServiceSid || undefined,
        alphaSenderId: alphaSenderId || undefined,
      });
      result = await smsProvider.sendSms(phoneNumber, message);
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

    // Return error - no automatic fallback to SMS
    // Include detailed error info for better user feedback
    const errorInfo = result.isTrialError
      ? `${result.error} (Trial account limitation)`
      : result.error;

    return {
      success: false,
      error: errorInfo,
      status: NotificationStatus.FAILED,
      channel,
      providerResponse: JSON.stringify({
        errorCode: result.errorCode,
        isTrialError: result.isTrialError,
      }),
    };
  }

  async sendInvite(guest: Guest, event: WeddingEvent, preferredChannel?: NotificationChannel): Promise<NotificationResult> {
    const channel = preferredChannel || this.getChannel(guest);
    const settings = await this.getSettings();

    // Use custom template from database (or fallback to default) for SMS
    const message = await renderMessage(guest, event, "INVITE");

    // Prepare WhatsApp options with Content Template if available
    let whatsappOptions: { contentSid?: string; contentVariables?: Record<string, string> } | undefined;

    if (settings?.whatsappInviteContentSid && channel === NotificationChannel.WHATSAPP) {
      // Use Content Template for WhatsApp Business API
      whatsappOptions = {
        contentSid: settings.whatsappInviteContentSid,
        contentVariables: {
          "1": guest.name, // {{1}} = guest name
          "2": event.title, // {{2}} = event title
          "3": this.getRsvpLink(guest.slug), // {{3}} = RSVP link
        },
      };
      console.log(`Using WhatsApp Content Template for INVITE: ${settings.whatsappInviteContentSid}`);
    }

    // Pass event's SMS sender ID for SMS channel
    return this.sendMessage(guest, message, channel, event.smsSenderId, whatsappOptions);
  }

  async sendReminder(guest: Guest, event: WeddingEvent, preferredChannel?: NotificationChannel): Promise<NotificationResult> {
    const channel = preferredChannel || this.getChannel(guest);
    const settings = await this.getSettings();

    // Use custom template from database (or fallback to default) for SMS
    const message = await renderMessage(guest, event, "REMINDER");

    // Prepare WhatsApp options with Content Template if available
    let whatsappOptions: { contentSid?: string; contentVariables?: Record<string, string> } | undefined;

    if (settings?.whatsappReminderContentSid && channel === NotificationChannel.WHATSAPP) {
      // Use Content Template for WhatsApp Business API
      whatsappOptions = {
        contentSid: settings.whatsappReminderContentSid,
        contentVariables: {
          "1": guest.name, // {{1}} = guest name
          "2": event.title, // {{2}} = event title
          "3": this.getRsvpLink(guest.slug), // {{3}} = RSVP link
        },
      };
      console.log(`Using WhatsApp Content Template for REMINDER: ${settings.whatsappReminderContentSid}`);
    }

    // Pass event's SMS sender ID for SMS channel
    return this.sendMessage(guest, message, channel, event.smsSenderId, whatsappOptions);
  }

  async sendConfirmation(
    guest: Guest,
    event: WeddingEvent,
    status: "ACCEPTED" | "DECLINED",
    preferredChannel?: NotificationChannel
  ): Promise<NotificationResult> {
    const channel = preferredChannel || this.getChannel(guest);
    const settings = await this.getSettings();

    const locale = event.notes?.includes("locale:en") ? "en" : "he";
    const templates = locale === "en" ? englishTemplates : hebrewTemplates;

    // Get guest count for accepted messages
    const guestRsvp = await prisma.guestRsvp.findUnique({
      where: { guestId: guest.id },
    });
    const guestCount = guestRsvp?.guestCount || 1;

    // Build location string with venue if available
    const locationString = event.venue
      ? `${event.venue}, ${event.location}`
      : event.location;

    const eventDate = event.dateTime.toLocaleDateString(locale === "en" ? "en-US" : "he-IL");

    let message: string;
    if (status === "ACCEPTED") {
      // Use custom message from event if available, otherwise use default
      if (event.rsvpConfirmedMessage) {
        // Replace placeholders in custom message
        message = event.rsvpConfirmedMessage
          .replace(/\{name\}/g, guest.name)
          .replace(/\{eventTitle\}/g, event.title)
          .replace(/\{eventDate\}/g, eventDate)
          .replace(/\{location\}/g, locationString)
          .replace(/\{venue\}/g, event.venue || event.location)
          .replace(/\{guestCount\}/g, String(guestCount));
      } else {
        // Default message from templates
        message = templates.confirmation.accepted.message(
          guest.name,
          event.title,
          eventDate,
          event.location
        );
      }
    } else {
      // Use custom message from event if available, otherwise use default
      if (event.rsvpDeclinedMessage) {
        // Replace placeholders in custom message
        message = event.rsvpDeclinedMessage
          .replace(/\{name\}/g, guest.name)
          .replace(/\{eventTitle\}/g, event.title)
          .replace(/\{eventDate\}/g, eventDate)
          .replace(/\{location\}/g, locationString)
          .replace(/\{venue\}/g, event.venue || event.location);
      } else {
        // Default message from templates
        message = templates.confirmation.declined.message(guest.name, event.title);
      }
    }

    // Prepare WhatsApp options with Content Template if available
    let whatsappOptions: { contentSid?: string; contentVariables?: Record<string, string> } | undefined;

    if (settings?.whatsappConfirmationContentSid && channel === NotificationChannel.WHATSAPP) {
      // Use Content Template for WhatsApp Business API
      whatsappOptions = {
        contentSid: settings.whatsappConfirmationContentSid,
        contentVariables: {
          "1": guest.name, // {{1}} = guest name
          "2": event.title, // {{2}} = event title
        },
      };
      console.log(`Using WhatsApp Content Template for CONFIRMATION: ${settings.whatsappConfirmationContentSid}`);
    }

    // Pass event's SMS sender ID for SMS channel
    return this.sendMessage(guest, message, channel, event.smsSenderId, whatsappOptions);
  }

  // Send interactive invite with buttons (WhatsApp only)
  async sendInteractiveInvite(
    guest: Guest,
    event: WeddingEvent,
    includeImage: boolean = false
  ): Promise<NotificationResult> {
    const settings = await this.getSettings();

    if (!settings?.whatsappInteractiveInviteContentSid) {
      return {
        success: false,
        error: "Interactive invite template not configured",
        status: NotificationStatus.FAILED,
        channel: NotificationChannel.WHATSAPP,
      };
    }

    if (!settings.whatsappEnabled || !settings.whatsappApiKey || !settings.whatsappApiSecret) {
      return {
        success: false,
        error: "WhatsApp not configured",
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
        channel: NotificationChannel.WHATSAPP,
      };
    }

    const phoneNumber = formatToE164(rawPhoneNumber, "IL");

    // Get active phone number
    const activePhone = await prisma.whatsAppPhoneNumber.findFirst({
      where: { isActive: true },
    });
    const fromNumber = activePhone?.phoneNumber || settings.whatsappPhoneNumber!;

    // Build content variables for template
    const contentVariables: Record<string, string> = {
      "1": guest.name, // {{1}} = guest name
      "2": event.title, // {{2}} = event title
    };

    // Add image URL as {{3}} if including image
    // Template uses https://res.cloudinary.com/{{3}} format, so we strip the base URL
    if (includeImage && event.invitationImageUrl) {
      contentVariables["3"] = event.invitationImageUrl.replace("https://res.cloudinary.com/", "");
    }

    // Create Twilio client
    const client = createTwilioClient(settings.whatsappApiKey, settings.whatsappApiSecret);

    try {
      // Build message options
      const messageOptions = {
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${phoneNumber}`,
        contentSid: settings.whatsappInteractiveInviteContentSid,
        contentVariables: JSON.stringify(contentVariables),
      };

      // Send using Twilio API
      const response = await client.messages.create(messageOptions);

      console.log(`Interactive invite sent to ${phoneNumber}: ${response.sid}`);

      return {
        success: true,
        status: NotificationStatus.SENT,
        channel: NotificationChannel.WHATSAPP,
        providerResponse: JSON.stringify({
          messageId: response.sid,
          status: response.status,
        }),
      };
    } catch (error) {
      console.error("Error sending interactive invite:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMessage,
        status: NotificationStatus.FAILED,
        channel: NotificationChannel.WHATSAPP,
        providerResponse: JSON.stringify({ error: errorMessage }),
      };
    }
  }

  // Send interactive reminder with buttons (WhatsApp only)
  async sendInteractiveReminder(
    guest: Guest,
    event: WeddingEvent,
    includeImage: boolean = false
  ): Promise<NotificationResult> {
    const settings = await this.getSettings();

    if (!settings?.whatsappInteractiveReminderContentSid) {
      return {
        success: false,
        error: "Interactive reminder template not configured",
        status: NotificationStatus.FAILED,
        channel: NotificationChannel.WHATSAPP,
      };
    }

    if (!settings.whatsappEnabled || !settings.whatsappApiKey || !settings.whatsappApiSecret) {
      return {
        success: false,
        error: "WhatsApp not configured",
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
        channel: NotificationChannel.WHATSAPP,
      };
    }

    const phoneNumber = formatToE164(rawPhoneNumber, "IL");

    // Get active phone number
    const activePhone = await prisma.whatsAppPhoneNumber.findFirst({
      where: { isActive: true },
    });
    const fromNumber = activePhone?.phoneNumber || settings.whatsappPhoneNumber!;

    // Build content variables for template
    const contentVariables: Record<string, string> = {
      "1": guest.name, // {{1}} = guest name
      "2": event.title, // {{2}} = event title
    };

    // Add image URL as {{3}} if including image
    // Template uses https://res.cloudinary.com/{{3}} format, so we strip the base URL
    if (includeImage && event.invitationImageUrl) {
      contentVariables["3"] = event.invitationImageUrl.replace("https://res.cloudinary.com/", "");
    }

    // Create Twilio client
    const client = createTwilioClient(settings.whatsappApiKey, settings.whatsappApiSecret);

    try {
      // Build message options
      const messageOptions = {
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${phoneNumber}`,
        contentSid: settings.whatsappInteractiveReminderContentSid,
        contentVariables: JSON.stringify(contentVariables),
      };

      // Send using Twilio API
      const response = await client.messages.create(messageOptions);

      console.log(`Interactive reminder sent to ${phoneNumber}: ${response.sid}`);

      return {
        success: true,
        status: NotificationStatus.SENT,
        channel: NotificationChannel.WHATSAPP,
        providerResponse: JSON.stringify({
          messageId: response.sid,
          status: response.status,
        }),
      };
    } catch (error) {
      console.error("Error sending interactive reminder:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMessage,
        status: NotificationStatus.FAILED,
        channel: NotificationChannel.WHATSAPP,
        providerResponse: JSON.stringify({ error: errorMessage }),
      };
    }
  }
}

// Export singleton instance for production use
export const notificationService = new TwilioNotificationService();
