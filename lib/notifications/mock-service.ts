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

  async sendInvite(guest: Guest, event: WeddingEvent): Promise<NotificationResult> {
    const channel = this.getChannel(guest);
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

  async sendReminder(guest: Guest, event: WeddingEvent): Promise<NotificationResult> {
    const channel = this.getChannel(guest);
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
    status: "ACCEPTED" | "DECLINED"
  ): Promise<NotificationResult> {
    const channel = this.getChannel(guest);

    const message =
      status === "ACCEPTED"
        ? hebrewTemplates.confirmation.accepted.message(
            guest.name,
            event.title,
            event.dateTime.toLocaleDateString("he-IL"),
            event.location
          )
        : hebrewTemplates.confirmation.declined.message(guest.name, event.title);

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
}

// Export singleton instance
export const notificationService = new MockNotificationService();
