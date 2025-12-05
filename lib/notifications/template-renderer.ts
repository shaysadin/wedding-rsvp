/**
 * Template Renderer for Message Templates
 *
 * Renders message templates by replacing placeholders with actual values.
 * Supports both custom templates from database and fallback to default templates.
 */

import { Guest, WeddingEvent, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/env.mjs";

// Default templates (fallback if no custom template exists)
const DEFAULT_TEMPLATES = {
  he: {
    INVITE: {
      title: "הזמנה לאירוע",
      message: `שלום {{guestName}}!

אתם מוזמנים ל{{eventTitle}}!

נשמח מאוד אם תאשרו את הגעתכם בקישור הבא:
{{rsvpLink}}

מחכים לראותכם!`,
    },
    REMINDER: {
      title: "תזכורת - אישור הגעה",
      message: `שלום {{guestName}}!

רצינו להזכיר לכם לאשר את הגעתכם ל{{eventTitle}}.

לאישור הגעה:
{{rsvpLink}}

תודה!`,
    },
  },
  en: {
    INVITE: {
      title: "Event Invitation",
      message: `Hello {{guestName}}!

You are invited to {{eventTitle}}!

Please confirm your attendance using the link below:
{{rsvpLink}}

We look forward to seeing you!`,
    },
    REMINDER: {
      title: "RSVP Reminder",
      message: `Hello {{guestName}}!

This is a reminder to confirm your attendance at {{eventTitle}}.

Please RSVP here:
{{rsvpLink}}

Thank you!`,
    },
  },
};

interface TemplateContext {
  guestName: string;
  eventTitle: string;
  rsvpLink: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventVenue: string;
}

/**
 * Replace all placeholders in a template string with actual values
 */
export function renderTemplateString(template: string, context: TemplateContext): string {
  return template
    .replace(/\{\{guestName\}\}/g, context.guestName)
    .replace(/\{\{eventTitle\}\}/g, context.eventTitle)
    .replace(/\{\{rsvpLink\}\}/g, context.rsvpLink)
    .replace(/\{\{eventDate\}\}/g, context.eventDate)
    .replace(/\{\{eventTime\}\}/g, context.eventTime)
    .replace(/\{\{eventLocation\}\}/g, context.eventLocation)
    .replace(/\{\{eventVenue\}\}/g, context.eventVenue);
}

/**
 * Get RSVP link for a guest
 */
export function getRsvpLink(guestSlug: string): string {
  return `${env.NEXT_PUBLIC_APP_URL}/rsvp/${guestSlug}`;
}

/**
 * Build template context from guest and event data
 */
export function buildTemplateContext(guest: Guest, event: WeddingEvent): TemplateContext {
  // Determine locale from event notes or default to Hebrew
  const locale = event.notes?.includes("locale:en") ? "en" : "he";

  return {
    guestName: guest.name,
    eventTitle: event.title,
    rsvpLink: getRsvpLink(guest.slug),
    eventDate: event.dateTime.toLocaleDateString(locale === "en" ? "en-US" : "he-IL"),
    eventTime: event.dateTime.toLocaleTimeString(locale === "en" ? "en-US" : "he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    eventLocation: event.location,
    eventVenue: event.venue || event.location,
  };
}

/**
 * Get the template for a specific event and type
 * First tries to fetch from database, falls back to default templates
 */
export async function getTemplate(
  eventId: string,
  type: NotificationType,
  locale: string = "he"
): Promise<{ title: string; message: string }> {
  // Try to get custom template from database
  const customTemplate = await prisma.messageTemplate.findFirst({
    where: {
      weddingEventId: eventId,
      type,
      locale,
      isActive: true,
    },
  });

  if (customTemplate) {
    return {
      title: customTemplate.title,
      message: customTemplate.message,
    };
  }

  // Fall back to default templates
  const defaults = DEFAULT_TEMPLATES[locale as keyof typeof DEFAULT_TEMPLATES] || DEFAULT_TEMPLATES.he;
  const templateKey = type as keyof typeof defaults;

  if (defaults[templateKey]) {
    return defaults[templateKey];
  }

  // Ultimate fallback
  return DEFAULT_TEMPLATES.he.INVITE;
}

/**
 * Render a complete message for sending
 * Fetches template from database and renders with guest/event data
 */
export async function renderMessage(
  guest: Guest,
  event: WeddingEvent,
  type: NotificationType
): Promise<string> {
  // Determine locale from event
  const locale = event.notes?.includes("locale:en") ? "en" : "he";

  // Get template
  const template = await getTemplate(event.id, type, locale);

  // Build context
  const context = buildTemplateContext(guest, event);

  // Render and return
  return renderTemplateString(template.message, context);
}
