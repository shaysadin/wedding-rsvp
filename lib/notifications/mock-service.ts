import { Guest, WeddingEvent, NotificationChannel } from "@prisma/client";
import { env } from "@/env.mjs";
import {
  NotificationService,
  NotificationResult,
  hebrewTemplates,
} from "./types";

/**
 * Mock Notification Service
 * Logs notifications to console and saves to database
 * Replace with actual WhatsApp/SMS/Email service in production
 */
export class MockNotificationService implements NotificationService {
  private getChannel(guest: Guest): NotificationChannel {
    // Priority: WhatsApp > SMS > Email
    if (guest.phoneNumber) {
      return "WHATSAPP"; // In production, check if WhatsApp is available
    }
    if (guest.email) {
      return "EMAIL";
    }
    return "SMS";
  }

  private getRsvpLink(guestSlug: string): string {
    return `${env.NEXT_PUBLIC_APP_URL}/rsvp/${guestSlug}`;
  }

  async sendInvite(guest: Guest, event: WeddingEvent, preferredChannel?: NotificationChannel): Promise<NotificationResult> {
    const channel = preferredChannel || this.getChannel(guest);
    const rsvpLink = this.getRsvpLink(guest.slug);
    const message = hebrewTemplates.invite.message(
      guest.name,
      event.title,
      rsvpLink
    );

    // Log to console (mock implementation)
    console.log("=".repeat(50));
    console.log("📨 MOCK NOTIFICATION - INVITE");
    console.log("=".repeat(50));
    console.log(`Channel: ${channel}`);
    console.log(`To: ${guest.phoneNumber || guest.email}`);
    console.log(`Guest: ${guest.name}`);
    console.log(`Event: ${event.title}`);
    console.log(`RSVP Link: ${rsvpLink}`);
    console.log("-".repeat(50));
    console.log("Message:");
    console.log(message);
    console.log("=".repeat(50));

    return {
      success: true,
      channel,
      status: "SENT",
      providerResponse: JSON.stringify({
        mock: true,
        timestamp: new Date().toISOString(),
        message: "Mock notification sent successfully",
      }),
    };
  }

  async sendReminder(guest: Guest, event: WeddingEvent, preferredChannel?: NotificationChannel): Promise<NotificationResult> {
    const channel = preferredChannel || this.getChannel(guest);
    const rsvpLink = this.getRsvpLink(guest.slug);
    const message = hebrewTemplates.reminder.message(
      guest.name,
      event.title,
      rsvpLink
    );

    // Log to console (mock implementation)
    console.log("=".repeat(50));
    console.log("🔔 MOCK NOTIFICATION - REMINDER");
    console.log("=".repeat(50));
    console.log(`Channel: ${channel}`);
    console.log(`To: ${guest.phoneNumber || guest.email}`);
    console.log(`Guest: ${guest.name}`);
    console.log(`Event: ${event.title}`);
    console.log(`RSVP Link: ${rsvpLink}`);
    console.log("-".repeat(50));
    console.log("Message:");
    console.log(message);
    console.log("=".repeat(50));

    return {
      success: true,
      channel,
      status: "SENT",
      providerResponse: JSON.stringify({
        mock: true,
        timestamp: new Date().toISOString(),
        message: "Mock reminder sent successfully",
      }),
    };
  }

  async sendConfirmation(
    guest: Guest,
    event: WeddingEvent,
    status: "ACCEPTED" | "DECLINED",
    preferredChannel?: NotificationChannel
  ): Promise<NotificationResult> {
    const channel = preferredChannel || this.getChannel(guest);

    // Build location string with venue if available
    const locationString = event.venue
      ? `${event.venue}, ${event.location}`
      : event.location;

    const eventDate = event.dateTime.toLocaleDateString("he-IL");

    let message: string;
    if (status === "ACCEPTED") {
      // Use custom message from event if available, otherwise use default
      if (event.rsvpConfirmedMessage) {
        // Note: In mock mode we don't have access to guestCount, using placeholder
        message = event.rsvpConfirmedMessage
          .replace(/\{name\}/g, guest.name)
          .replace(/\{eventTitle\}/g, event.title)
          .replace(/\{eventDate\}/g, eventDate)
          .replace(/\{location\}/g, locationString)
          .replace(/\{venue\}/g, event.venue || event.location)
          .replace(/\{guestCount\}/g, "1");
      } else {
        // Default message from templates
        message = hebrewTemplates.confirmation.accepted.message(
          guest.name,
          event.title,
          eventDate,
          event.location
        );
      }
    } else {
      // Use custom message from event if available, otherwise use default
      if (event.rsvpDeclinedMessage) {
        message = event.rsvpDeclinedMessage
          .replace(/\{name\}/g, guest.name)
          .replace(/\{eventTitle\}/g, event.title)
          .replace(/\{eventDate\}/g, eventDate)
          .replace(/\{location\}/g, locationString)
          .replace(/\{venue\}/g, event.venue || event.location);
      } else {
        // Default message from templates
        message = hebrewTemplates.confirmation.declined.message(guest.name, event.title);
      }
    }

    // Log to console (mock implementation)
    console.log("=".repeat(50));
    console.log(`✅ MOCK NOTIFICATION - CONFIRMATION (${status})`);
    console.log("=".repeat(50));
    console.log(`Channel: ${channel}`);
    console.log(`To: ${guest.phoneNumber || guest.email}`);
    console.log(`Guest: ${guest.name}`);
    console.log(`Event: ${event.title}`);
    console.log(`Status: ${status}`);
    console.log("-".repeat(50));
    console.log("Message:");
    console.log(message);
    console.log("=".repeat(50));

    return {
      success: true,
      channel,
      status: "SENT",
      providerResponse: JSON.stringify({
        mock: true,
        timestamp: new Date().toISOString(),
        message: "Mock confirmation sent successfully",
      }),
    };
  }

  async sendInteractiveInvite(
    guest: Guest,
    event: WeddingEvent,
    includeImage: boolean = false
  ): Promise<NotificationResult> {
    // Log to console (mock implementation)
    console.log("=".repeat(50));
    console.log("📱 MOCK NOTIFICATION - INTERACTIVE INVITE");
    console.log("=".repeat(50));
    console.log(`Channel: WHATSAPP`);
    console.log(`To: ${guest.phoneNumber}`);
    console.log(`Guest: ${guest.name}`);
    console.log(`Event: ${event.title}`);
    console.log(`Include Image: ${includeImage}`);
    console.log(`Image URL: ${event.invitationImageUrl || "N/A"}`);
    console.log("-".repeat(50));
    console.log("Buttons:");
    console.log("  [Yes, I'll attend]");
    console.log("  [No, I won't attend]");
    console.log("  [Don't know yet]");
    console.log("=".repeat(50));

    return {
      success: true,
      channel: "WHATSAPP",
      status: "SENT",
      providerResponse: JSON.stringify({
        mock: true,
        timestamp: new Date().toISOString(),
        message: "Mock interactive invite sent successfully",
      }),
    };
  }

  async sendInteractiveReminder(
    guest: Guest,
    event: WeddingEvent,
    includeImage: boolean = false
  ): Promise<NotificationResult> {
    // Log to console (mock implementation)
    console.log("=".repeat(50));
    console.log("🔔 MOCK NOTIFICATION - INTERACTIVE REMINDER");
    console.log("=".repeat(50));
    console.log(`Channel: WHATSAPP`);
    console.log(`To: ${guest.phoneNumber}`);
    console.log(`Guest: ${guest.name}`);
    console.log(`Event: ${event.title}`);
    console.log(`Include Image: ${includeImage}`);
    console.log(`Image URL: ${event.invitationImageUrl || "N/A"}`);
    console.log("-".repeat(50));
    console.log("Buttons:");
    console.log("  [Yes, I'll attend]");
    console.log("  [No, I won't attend]");
    console.log("  [Don't know yet]");
    console.log("=".repeat(50));

    return {
      success: true,
      channel: "WHATSAPP",
      status: "SENT",
      providerResponse: JSON.stringify({
        mock: true,
        timestamp: new Date().toISOString(),
        message: "Mock interactive reminder sent successfully",
      }),
    };
  }
}

// Export singleton instance
export const notificationService = new MockNotificationService();
