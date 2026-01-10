/**
 * WhatsApp Template Definitions
 *
 * These templates must be approved in the Twilio dashboard before use.
 * The Content SIDs are stored in the database (WhatsAppTemplate model).
 *
 * Template Types:
 * - INVITE: Standard invite with RSVP link
 * - REMINDER: Standard reminder with RSVP link
 * - INTERACTIVE_INVITE: Interactive buttons invite (Yes/No/Maybe)
 * - INTERACTIVE_REMINDER: Interactive buttons reminder (Yes/No/Maybe)
 *
 * Each type has 3 styles:
 * - formal: Professional, respectful tone
 * - friendly: Warm, casual tone with emoji
 * - short: Brief, to the point
 *
 * Placeholders for Twilio Content Templates:
 * - {{1}} = Guest name
 * - {{2}} = Event title
 * - {{3}} = RSVP link (for standard templates)
 */

export type WhatsAppTemplateType =
  | "INVITE"
  | "REMINDER"
  | "INTERACTIVE_INVITE"
  | "INTERACTIVE_REMINDER";

export type WhatsAppTemplateStyle = "formal" | "friendly" | "short";

export interface WhatsAppTemplateDefinition {
  type: WhatsAppTemplateType;
  style: WhatsAppTemplateStyle;
  nameHe: string;
  nameEn: string;
  // Template text for reference (actual template is in Twilio)
  templateTextHe: string;
  templateTextEn: string;
  // Twilio template name suggestion
  twilioTemplateName: string;
}

/**
 * Standard Invite Templates (with RSVP link)
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle, {{3}} = rsvpLink
 */
export const WHATSAPP_INVITE_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "INVITE",
    style: "formal",
    nameHe: "רשמי",
    nameEn: "Formal",
    twilioTemplateName: "wedinex_invite_formal",
    templateTextHe: `שלום {{1}},

אתם מוזמנים בשמחה ל{{2}}.

נודה לכם אם תאשרו את הגעתכם בקישור הבא:
{{3}}

בברכה,
המארגנים`,
    templateTextEn: `Dear {{1}},

You are cordially invited to {{2}}.

Please confirm your attendance:
{{3}}

Best regards,
The Hosts`,
  },
  {
    type: "INVITE",
    style: "friendly",
    nameHe: "ידידותי",
    nameEn: "Friendly",
    twilioTemplateName: "wedinex_invite_friendly",
    templateTextHe: `היי {{1}}! 💍

מזל טוב! מוזמנים ל{{2}}!
נשמח מאוד לראותכם 🎉

אשרו הגעה כאן: {{3}}`,
    templateTextEn: `Hey {{1}}! 💍

Great news! You're invited to {{2}}!
We'd love to see you there 🎉

RSVP here: {{3}}`,
  },
  {
    type: "INVITE",
    style: "short",
    nameHe: "קצר",
    nameEn: "Short",
    twilioTemplateName: "wedinex_invite_short",
    templateTextHe: `{{1}}, מוזמנים ל{{2}}!
לאישור הגעה: {{3}}`,
    templateTextEn: `{{1}}, you're invited to {{2}}!
RSVP: {{3}}`,
  },
];

/**
 * Standard Reminder Templates (with RSVP link)
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle, {{3}} = rsvpLink
 */
export const WHATSAPP_REMINDER_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "REMINDER",
    style: "formal",
    nameHe: "עדין",
    nameEn: "Gentle",
    twilioTemplateName: "wedinex_reminder_formal",
    templateTextHe: `שלום {{1}},

רצינו להזכיר שטרם התקבלה תשובתכם להזמנה ל{{2}}.

נודה לכם אם תאשרו את הגעתכם:
{{3}}

תודה רבה`,
    templateTextEn: `Hi {{1}},

A gentle reminder that we haven't received your RSVP for {{2}}.

Please let us know if you can attend:
{{3}}

Thank you`,
  },
  {
    type: "REMINDER",
    style: "friendly",
    nameHe: "חברי",
    nameEn: "Casual",
    twilioTemplateName: "wedinex_reminder_friendly",
    templateTextHe: `היי {{1}}! 👋

עדיין לא קיבלנו תשובה ל{{2}}.
נשמח לדעת אם מגיעים! 😊

לחצו כאן: {{3}}`,
    templateTextEn: `Hey {{1}}! 👋

We're still waiting to hear from you about {{2}}.
Would love to know if you're coming! 😊

Click here: {{3}}`,
  },
  {
    type: "REMINDER",
    style: "short",
    nameHe: "דחוף",
    nameEn: "Urgent",
    twilioTemplateName: "wedinex_reminder_short",
    templateTextHe: `{{1}}, ממתינים לתשובתך ל{{2}}! ⏰
אשרו כאן: {{3}}`,
    templateTextEn: `{{1}}, awaiting your response for {{2}}! ⏰
RSVP: {{3}}`,
  },
];

/**
 * Interactive Invite Templates (with buttons: Yes/No/Maybe)
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle
 * Note: No RSVP link needed - buttons handle the response
 */
export const WHATSAPP_INTERACTIVE_INVITE_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "INTERACTIVE_INVITE",
    style: "formal",
    nameHe: "רשמי",
    nameEn: "Formal",
    twilioTemplateName: "wedinex_interactive_invite_formal",
    templateTextHe: `שלום {{1}},

אתם מוזמנים בשמחה ל{{2}}.

נודה לכם אם תאשרו את הגעתכם על ידי לחיצה על אחד הכפתורים למטה.

בברכה`,
    templateTextEn: `Dear {{1}},

You are cordially invited to {{2}}.

Please confirm your attendance by clicking one of the buttons below.

Best regards`,
  },
  {
    type: "INTERACTIVE_INVITE",
    style: "friendly",
    nameHe: "ידידותי",
    nameEn: "Friendly",
    twilioTemplateName: "wedinex_interactive_invite_friendly",
    templateTextHe: `היי {{1}}! 💍✨

מוזמנים ל{{2}}!
נשמח מאוד אם תגיעו לחגוג איתנו 🎉

ספרו לנו - מגיעים?`,
    templateTextEn: `Hey {{1}}! 💍✨

You're invited to {{2}}!
We'd love to have you celebrate with us 🎉

Let us know - are you coming?`,
  },
  {
    type: "INTERACTIVE_INVITE",
    style: "short",
    nameHe: "קצר",
    nameEn: "Short",
    twilioTemplateName: "wedinex_interactive_invite_short",
    templateTextHe: `{{1}}, מוזמנים ל{{2}}!
מגיעים?`,
    templateTextEn: `{{1}}, invited to {{2}}!
Coming?`,
  },
];

/**
 * Interactive Reminder Templates (with buttons: Yes/No/Maybe)
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle
 */
export const WHATSAPP_INTERACTIVE_REMINDER_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "INTERACTIVE_REMINDER",
    style: "formal",
    nameHe: "עדין",
    nameEn: "Gentle",
    twilioTemplateName: "wedinex_interactive_reminder_formal",
    templateTextHe: `שלום {{1}},

רצינו להזכיר שטרם התקבלה תשובתכם להזמנה ל{{2}}.

נודה לתשובתכם על ידי לחיצה על אחד הכפתורים.

תודה רבה`,
    templateTextEn: `Hi {{1}},

A gentle reminder that we haven't received your RSVP for {{2}}.

Please respond by clicking one of the buttons.

Thank you`,
  },
  {
    type: "INTERACTIVE_REMINDER",
    style: "friendly",
    nameHe: "חברי",
    nameEn: "Casual",
    twilioTemplateName: "wedinex_interactive_reminder_friendly",
    templateTextHe: `היי {{1}}! 👋

עדיין מחכים לתשובתך ל{{2}}!
נשמח לדעת אם מגיעים 😊

בחרו למטה:`,
    templateTextEn: `Hey {{1}}! 👋

Still waiting to hear about {{2}}!
Would love to know if you're coming 😊

Choose below:`,
  },
  {
    type: "INTERACTIVE_REMINDER",
    style: "short",
    nameHe: "דחוף",
    nameEn: "Urgent",
    twilioTemplateName: "wedinex_interactive_reminder_short",
    templateTextHe: `{{1}}, ממתינים לתשובתך ל{{2}}! ⏰`,
    templateTextEn: `{{1}}, awaiting your response for {{2}}! ⏰`,
  },
];

/**
 * Get all templates for a specific type
 */
export function getWhatsAppTemplateDefinitions(
  type: WhatsAppTemplateType
): WhatsAppTemplateDefinition[] {
  switch (type) {
    case "INVITE":
      return WHATSAPP_INVITE_TEMPLATES;
    case "REMINDER":
      return WHATSAPP_REMINDER_TEMPLATES;
    case "INTERACTIVE_INVITE":
      return WHATSAPP_INTERACTIVE_INVITE_TEMPLATES;
    case "INTERACTIVE_REMINDER":
      return WHATSAPP_INTERACTIVE_REMINDER_TEMPLATES;
    default:
      return [];
  }
}

/**
 * Get a specific template definition by type and style
 */
export function getWhatsAppTemplateDefinition(
  type: WhatsAppTemplateType,
  style: WhatsAppTemplateStyle
): WhatsAppTemplateDefinition | undefined {
  const templates = getWhatsAppTemplateDefinitions(type);
  return templates.find((t) => t.style === style);
}

/**
 * All template definitions for seeding/reference
 */
export const ALL_WHATSAPP_TEMPLATE_DEFINITIONS: WhatsAppTemplateDefinition[] = [
  ...WHATSAPP_INVITE_TEMPLATES,
  ...WHATSAPP_REMINDER_TEMPLATES,
  ...WHATSAPP_INTERACTIVE_INVITE_TEMPLATES,
  ...WHATSAPP_INTERACTIVE_REMINDER_TEMPLATES,
];
