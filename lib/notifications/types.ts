import {
  Guest,
  WeddingEvent,
  NotificationChannel,
  NotificationType,
  NotificationStatus,
} from "@prisma/client";

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  status: NotificationStatus;
  providerResponse?: string;
  error?: string;
}

export interface NotificationService {
  sendInvite(
    guest: Guest,
    event: WeddingEvent,
    preferredChannel?: NotificationChannel
  ): Promise<NotificationResult>;

  sendReminder(
    guest: Guest,
    event: WeddingEvent,
    preferredChannel?: NotificationChannel
  ): Promise<NotificationResult>;

  sendConfirmation(
    guest: Guest,
    event: WeddingEvent,
    status: "ACCEPTED" | "DECLINED",
    preferredChannel?: NotificationChannel
  ): Promise<NotificationResult>;

  // Interactive button messages (WhatsApp only)
  sendInteractiveInvite(
    guest: Guest,
    event: WeddingEvent,
    includeImage?: boolean
  ): Promise<NotificationResult>;

  sendInteractiveReminder(
    guest: Guest,
    event: WeddingEvent,
    includeImage?: boolean
  ): Promise<NotificationResult>;
}

export interface NotificationTemplate {
  invite: {
    title: string;
    message: (guestName: string, eventTitle: string, rsvpLink: string) => string;
  };
  reminder: {
    title: string;
    message: (guestName: string, eventTitle: string, rsvpLink: string) => string;
  };
  confirmation: {
    accepted: {
      title: string;
      message: (guestName: string, eventTitle: string, eventDate: string, eventLocation: string) => string;
    };
    declined: {
      title: string;
      message: (guestName: string, eventTitle: string) => string;
    };
  };
}

export const hebrewTemplates: NotificationTemplate = {
  invite: {
    title: "הזמנה לחתונה",
    message: (guestName, eventTitle, rsvpLink) =>
      `שלום ${guestName}!\n\nאתם מוזמנים ל${eventTitle}!\n\nנשמח מאוד אם תאשרו את הגעתכם בקישור הבא:\n${rsvpLink}\n\nמחכים לראותכם!`,
  },
  reminder: {
    title: "תזכורת - אישור הגעה",
    message: (guestName, eventTitle, rsvpLink) =>
      `שלום ${guestName}!\n\nרצינו להזכיר לכם לאשר את הגעתכם ל${eventTitle}.\n\nלאישור הגעה:\n${rsvpLink}\n\nתודה!`,
  },
  confirmation: {
    accepted: {
      title: "אישור הגעה התקבל",
      message: (guestName, eventTitle, eventDate, eventLocation) =>
        `שלום ${guestName}!\n\nתודה שאישרתם את הגעתכם ל${eventTitle}!\n\nפרטי האירוע:\nתאריך: ${eventDate}\nמיקום: ${eventLocation}\n\nנתראה!`,
    },
    declined: {
      title: "תודה על התשובה",
      message: (guestName, eventTitle) =>
        `שלום ${guestName}!\n\nקיבלנו את התשובה שלכם לגבי ${eventTitle}.\n\nמקווים לראותכם בהזדמנות אחרת!`,
    },
  },
};

export const englishTemplates: NotificationTemplate = {
  invite: {
    title: "Wedding Invitation",
    message: (guestName, eventTitle, rsvpLink) =>
      `Hello ${guestName}!\n\nYou are invited to ${eventTitle}!\n\nPlease confirm your attendance using the link below:\n${rsvpLink}\n\nWe look forward to seeing you!`,
  },
  reminder: {
    title: "RSVP Reminder",
    message: (guestName, eventTitle, rsvpLink) =>
      `Hello ${guestName}!\n\nThis is a reminder to confirm your attendance at ${eventTitle}.\n\nPlease RSVP here:\n${rsvpLink}\n\nThank you!`,
  },
  confirmation: {
    accepted: {
      title: "RSVP Confirmed",
      message: (guestName, eventTitle, eventDate, eventLocation) =>
        `Hello ${guestName}!\n\nThank you for confirming your attendance at ${eventTitle}!\n\nEvent details:\nDate: ${eventDate}\nLocation: ${eventLocation}\n\nSee you there!`,
    },
    declined: {
      title: "Thank you for your response",
      message: (guestName, eventTitle) =>
        `Hello ${guestName}!\n\nWe've received your response for ${eventTitle}.\n\nWe hope to see you at another occasion!`,
    },
  },
};
