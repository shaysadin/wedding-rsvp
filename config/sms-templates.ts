/**
 * Predefined SMS Templates
 *
 * These templates are used for SMS messages. WhatsApp uses pre-approved
 * templates in the Twilio dashboard.
 *
 * Placeholders:
 * - {{guestName}} - Guest's name
 * - {{eventTitle}} - Event title
 * - {{rsvpLink}} - RSVP link
 * - {{eventDate}} - Event date
 * - {{eventVenue}} - Event venue
 */

export interface SmsTemplate {
  id: string;
  nameHe: string;
  nameEn: string;
  messageHe: string;
  messageEn: string;
}

export const SMS_INVITE_TEMPLATES: SmsTemplate[] = [
  {
    id: "invite-formal",
    nameHe: "רשמי",
    nameEn: "Formal",
    messageHe: `שלום {{guestName}}!
אתם מוזמנים ל{{eventTitle}}.
לאישור הגעה: {{rsvpLink}}`,
    messageEn: `Dear {{guestName}},
You are invited to {{eventTitle}}.
RSVP: {{rsvpLink}}`,
  },
  {
    id: "invite-friendly",
    nameHe: "ידידותי",
    nameEn: "Friendly",
    messageHe: `היי {{guestName}}! 💍
מוזמנים ל{{eventTitle}}!
נשמח אם תאשרו: {{rsvpLink}}`,
    messageEn: `Hey {{guestName}}! 💍
You're invited to {{eventTitle}}!
Please RSVP: {{rsvpLink}}`,
  },
  {
    id: "invite-short",
    nameHe: "קצר",
    nameEn: "Short",
    messageHe: `{{guestName}}, מוזמנים ל{{eventTitle}}! אישור: {{rsvpLink}}`,
    messageEn: `{{guestName}}, invited to {{eventTitle}}! RSVP: {{rsvpLink}}`,
  },
];

export const SMS_REMINDER_TEMPLATES: SmsTemplate[] = [
  {
    id: "reminder-gentle",
    nameHe: "עדין",
    nameEn: "Gentle",
    messageHe: `שלום {{guestName}}!
רצינו להזכיר שטרם אישרתם הגעה ל{{eventTitle}}.
נשמח לתגובתכם: {{rsvpLink}}`,
    messageEn: `Hi {{guestName}},
Reminder: please RSVP for {{eventTitle}}.
Confirm here: {{rsvpLink}}`,
  },
  {
    id: "reminder-urgent",
    nameHe: "דחוף",
    nameEn: "Urgent",
    messageHe: `{{guestName}}, ממתינים לתשובתך! ⏰
אנא אשרו הגעה ל{{eventTitle}} בהקדם: {{rsvpLink}}`,
    messageEn: `{{guestName}}, awaiting your response! ⏰
Please RSVP for {{eventTitle}}: {{rsvpLink}}`,
  },
  {
    id: "reminder-casual",
    nameHe: "חברי",
    nameEn: "Casual",
    messageHe: `היי {{guestName}}! עדיין לא קיבלנו תגובה 😊
ספרו לנו אם מגיעים: {{rsvpLink}}`,
    messageEn: `Hey {{guestName}}! Still waiting to hear from you 😊
Let us know: {{rsvpLink}}`,
  },
];

// Maximum SMS length (GSM-7 encoding allows 160 chars, but Unicode limits to ~70)
// Using 256 as a reasonable limit for multi-part SMS
export const SMS_MAX_LENGTH = 256;

// Get template by ID
export function getSmsTemplate(
  type: "INVITE" | "REMINDER",
  templateId: string
): SmsTemplate | undefined {
  const templates = type === "INVITE" ? SMS_INVITE_TEMPLATES : SMS_REMINDER_TEMPLATES;
  return templates.find((t) => t.id === templateId);
}

// Get all templates for a type
export function getSmsTemplates(type: "INVITE" | "REMINDER"): SmsTemplate[] {
  return type === "INVITE" ? SMS_INVITE_TEMPLATES : SMS_REMINDER_TEMPLATES;
}

// Render template with context
export function renderSmsTemplate(
  template: string,
  context: {
    guestName: string;
    eventTitle: string;
    rsvpLink: string;
    eventDate?: string;
    eventVenue?: string;
  }
): string {
  return template
    .replace(/\{\{guestName\}\}/g, context.guestName)
    .replace(/\{\{eventTitle\}\}/g, context.eventTitle)
    .replace(/\{\{rsvpLink\}\}/g, context.rsvpLink)
    .replace(/\{\{eventDate\}\}/g, context.eventDate || "")
    .replace(/\{\{eventVenue\}\}/g, context.eventVenue || "");
}
