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

    const message =
      status === "ACCEPTED"
        ? templates.confirmation.accepted.message(
            guest.name,
            event.title,
            event.dateTime.toLocaleDateString(locale === "en" ? "en-US" : "he-IL"),
            event.location
          )
        : templates.confirmation.declined.message(guest.name, event.title);

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
}
