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
 * - IMAGE_INVITE: Same as Interactive Invite but with wedding invitation image
 * - TRANSPORTATION_INVITE: Formal invite with RSVP link + Transportation registration link
 * - CONFIRMATION: RSVP confirmation/thank you for responding
 * - EVENT_DAY: Event day reminder (morning of event with table, address, gift link)
 * - THANK_YOU: Thank you message (day after event)
 * - TABLE_ASSIGNMENT: Table assignment notification
 * - GUEST_COUNT_LIST: Guest count selection list (interactive)
 *
 * Each type has 3 styles:
 * - style1: Professional, respectful tone (DEFAULT - already approved)
 * - style2: Warm, casual tone with emoji (NEEDS APPROVAL)
 * - style3: Brief, to the point (NEEDS APPROVAL)
 *
 * Placeholders for Twilio Content Templates:
 * - {{1}} = Guest name
 * - {{2}} = Event title
 * - {{3}} = RSVP link (for standard templates) or other context-specific data
 *
 * EXISTING APPROVED TEMPLATES (FORMAL STYLE):
 * - copy_wedding_invitation (HX1a4aaf40cf5f7fd8a9a36f5c83226bd3) -> INVITE formal
 * - copy_wedding_reminder (HXb9855ad5e6b9797f3195574a090417ac) -> REMINDER formal
 * - interactive_invite_card (HXff76515d76bbe3e50656ef59bdf90fc6) -> INTERACTIVE_INVITE formal, IMAGE_INVITE formal
 * - interactive_reminder_card (HXba2294e9683d133dfe92c62692e9d3f2) -> INTERACTIVE_REMINDER formal
 * - event_day_reminder (HX80e0ff2024fb29d65878e002df31afd3) -> EVENT_DAY formal
 * - thank_you_message (HX2e0cc26147f657e88a902b48349158b7) -> THANK_YOU formal
 * - guest_count_list (HX4322c2482da4bce43d001668b83234a6) -> GUEST_COUNT_LIST formal
 *
 * LEGACY SETTINGS FALLBACK (from MessagingProviderSettings):
 * - whatsappConfirmationContentSid -> CONFIRMATION (not yet configured)
 * - TABLE_ASSIGNMENT -> uses freeform message if no template configured
 */

export type WhatsAppTemplateType =
  | "INVITE"
  | "REMINDER"
  | "INTERACTIVE_INVITE"
  | "INTERACTIVE_REMINDER"
  | "IMAGE_INVITE"
  | "TRANSPORTATION_INVITE"
  | "CONFIRMATION"
  | "EVENT_DAY"
  | "THANK_YOU"
  | "TABLE_ASSIGNMENT"
  | "GUEST_COUNT_LIST";

export type WhatsAppTemplateStyle = "style1" | "style2" | "style3";

export interface WhatsAppTemplateDefinition {
  type: WhatsAppTemplateType;
  style: WhatsAppTemplateStyle;
  nameHe: string;
  nameEn: string;
  // Template text for reference (actual template is in Twilio)
  templateTextHe: string;
  templateTextEn: string;
  // Twilio template name (existing or suggested for new)
  twilioTemplateName: string;
  // Content SID if already approved (null if pending approval)
  existingContentSid?: string;
}

/**
 * Standard Invite Templates (with RSVP link)
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle, {{3}} = rsvpLink
 */
export const WHATSAPP_INVITE_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "INVITE",
    style: "style1",
    nameHe: "סגנון 1",
    nameEn: "Style 1",
    twilioTemplateName: "copy_wedding_invitation",
    existingContentSid: "HX1a4aaf40cf5f7fd8a9a36f5c83226bd3",
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
    style: "style2",
    nameHe: "סגנון 2",
    nameEn: "Style 2",
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
    style: "style3",
    nameHe: "סגנון 3",
    nameEn: "Style 3",
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
    style: "style1",
    nameHe: "סגנון 1",
    nameEn: "Style 1",
    twilioTemplateName: "copy_wedding_reminder",
    existingContentSid: "HXb9855ad5e6b9797f3195574a090417ac",
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
    style: "style2",
    nameHe: "סגנון 2",
    nameEn: "Style 2",
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
    style: "style3",
    nameHe: "סגנון 3",
    nameEn: "Style 3",
    twilioTemplateName: "wedinex_reminder_short",
    templateTextHe: `{{1}}, ממתינים לתשובתך ל{{2}}! ⏰
אשרו כאן: {{3}}`,
    templateTextEn: `{{1}}, awaiting your response for {{2}}! ⏰
RSVP: {{3}}`,
  },
];

/**
 * Interactive Invite Templates (with buttons: Yes/No/Maybe)
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle, {{4}} = transportationLink (optional)
 * Note: No RSVP link needed - buttons handle the response
 * Note: {{3}} is skipped to maintain consistency with other templates (where {{3}} = RSVP link)
 */
export const WHATSAPP_INTERACTIVE_INVITE_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "INTERACTIVE_INVITE",
    style: "style1",
    nameHe: "סגנון 1",
    nameEn: "Style 1",
    twilioTemplateName: "interactive_invite_card",
    existingContentSid: "HXff76515d76bbe3e50656ef59bdf90fc6",
    templateTextHe: `שלום {{1}},

אתם מוזמנים בשמחה ל{{2}}.

נודה לכם אם תאשרו את הגעתכם על ידי לחיצה על אחד הכפתורים למטה.

{{4}}

בברכה`,
    templateTextEn: `Dear {{1}},

You are cordially invited to {{2}}.

Please confirm your attendance by clicking one of the buttons below.

{{4}}

Best regards`,
  },
  {
    type: "INTERACTIVE_INVITE",
    style: "style2",
    nameHe: "סגנון 2",
    nameEn: "Style 2",
    twilioTemplateName: "wedinex_interactive_invite_friendly",
    templateTextHe: `היי {{1}}! 💍✨

מוזמנים ל{{2}}!
נשמח מאוד אם תגיעו לחגוג איתנו 🎉

{{4}}

ספרו לנו - מגיעים?`,
    templateTextEn: `Hey {{1}}! 💍✨

You're invited to {{2}}!
We'd love to have you celebrate with us 🎉

{{4}}

Let us know - are you coming?`,
  },
  {
    type: "INTERACTIVE_INVITE",
    style: "style3",
    nameHe: "סגנון 3",
    nameEn: "Style 3",
    twilioTemplateName: "wedinex_interactive_invite_short",
    templateTextHe: `{{1}}, מוזמנים ל{{2}}!

{{4}}

מגיעים?`,
    templateTextEn: `{{1}}, invited to {{2}}!

{{4}}

Coming?`,
  },
];

/**
 * Interactive Reminder Templates (with buttons: Yes/No/Maybe)
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle, {{4}} = transportationLink (optional)
 * Note: {{3}} is skipped to maintain consistency with other templates (where {{3}} = RSVP link)
 */
export const WHATSAPP_INTERACTIVE_REMINDER_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "INTERACTIVE_REMINDER",
    style: "style1",
    nameHe: "סגנון 1",
    nameEn: "Style 1",
    twilioTemplateName: "interactive_reminder_card",
    existingContentSid: "HXba2294e9683d133dfe92c62692e9d3f2",
    templateTextHe: `שלום {{1}},

רצינו להזכיר שטרם התקבלה תשובתכם להזמנה ל{{2}}.

נודה לתשובתכם על ידי לחיצה על אחד הכפתורים.

{{4}}

תודה רבה`,
    templateTextEn: `Hi {{1}},

A gentle reminder that we haven't received your RSVP for {{2}}.

Please respond by clicking one of the buttons.

{{4}}

Thank you`,
  },
  {
    type: "INTERACTIVE_REMINDER",
    style: "style2",
    nameHe: "סגנון 2",
    nameEn: "Style 2",
    twilioTemplateName: "wedinex_interactive_reminder_friendly",
    templateTextHe: `היי {{1}}! 👋

עדיין מחכים לתשובתך ל{{2}}!
נשמח לדעת אם מגיעים 😊

{{4}}

בחרו למטה:`,
    templateTextEn: `Hey {{1}}! 👋

Still waiting to hear about {{2}}!
Would love to know if you're coming 😊

{{4}}

Choose below:`,
  },
  {
    type: "INTERACTIVE_REMINDER",
    style: "style3",
    nameHe: "סגנון 3",
    nameEn: "Style 3",
    twilioTemplateName: "wedinex_interactive_reminder_short",
    templateTextHe: `{{1}}, ממתינים לתשובתך ל{{2}}! ⏰

{{4}}`,
    templateTextEn: `{{1}}, awaiting your response for {{2}}! ⏰

{{4}}`,
  },
];

/**
 * Image Invite Templates (with wedding invitation image)
 * Uses the same template as Interactive Invite, but with an image attached
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle
 */
export const WHATSAPP_IMAGE_INVITE_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "IMAGE_INVITE",
    style: "style1",
    nameHe: "סגנון 1",
    nameEn: "Style 1",
    twilioTemplateName: "interactive_invite_card",
    existingContentSid: "HXff76515d76bbe3e50656ef59bdf90fc6", // Same as Interactive Invite
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
    type: "IMAGE_INVITE",
    style: "style2",
    nameHe: "סגנון 2",
    nameEn: "Style 2",
    twilioTemplateName: "wedinex_image_invite_friendly",
    templateTextHe: `היי {{1}}! 💍✨

שלחנו לכם את ההזמנה ל{{2}}!
נשמח מאוד לראותכם 🎉`,
    templateTextEn: `Hey {{1}}! 💍✨

Here's your invitation to {{2}}!
We'd love to see you there 🎉`,
  },
  {
    type: "IMAGE_INVITE",
    style: "style3",
    nameHe: "סגנון 3",
    nameEn: "Style 3",
    twilioTemplateName: "wedinex_image_invite_short",
    templateTextHe: `{{1}}, מצורפת ההזמנה ל{{2}}!`,
    templateTextEn: `{{1}}, here's your invitation to {{2}}!`,
  },
];

/**
 * Transportation Invite Templates (with RSVP link + Transportation registration link)
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle, {{3}} = rsvpLink, {{4}} = transportationLink
 */
export const WHATSAPP_TRANSPORTATION_INVITE_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "TRANSPORTATION_INVITE",
    style: "style1",
    nameHe: "סגנון 1 + הסעות",
    nameEn: "Style 1 + Transportation",
    twilioTemplateName: "wedinex_transportation_invite_formal",
    templateTextHe: `שלום {{1}},

אתם מוזמנים בשמחה ל{{2}}.

נודה לכם אם תאשרו את הגעתכם בקישור הבא:
{{3}}

בנוסף, נשמח לארגן עבורכם הסעות לאירוע. להרשמה להסעות:
{{4}}

בברכה,
המארגנים`,
    templateTextEn: `Dear {{1}},

You are cordially invited to {{2}}.

Please confirm your attendance:
{{3}}

Additionally, we'd be happy to arrange transportation for you. To register for transportation:
{{4}}

Best regards,
The Hosts`,
  },
  {
    type: "TRANSPORTATION_INVITE",
    style: "style2",
    nameHe: "סגנון 2 + הסעות",
    nameEn: "Style 2 + Transportation",
    twilioTemplateName: "wedinex_transportation_invite_friendly",
    templateTextHe: `היי {{1}}! 💍

מזל טוב! מוזמנים ל{{2}}!
נשמח מאוד לראותכם 🎉

אשרו הגעה כאן: {{3}}

רוצים הסעות? 🚐 נשמח לארגן!
הרשמו כאן: {{4}}`,
    templateTextEn: `Hey {{1}}! 💍

Great news! You're invited to {{2}}!
We'd love to see you there 🎉

RSVP here: {{3}}

Need transportation? 🚐 We'd love to arrange it!
Register here: {{4}}`,
  },
  {
    type: "TRANSPORTATION_INVITE",
    style: "style3",
    nameHe: "סגנון 3 + הסעות",
    nameEn: "Style 3 + Transportation",
    twilioTemplateName: "wedinex_transportation_invite_short",
    templateTextHe: `{{1}}, מוזמנים ל{{2}}!
אישור הגעה: {{3}}
הרשמה להסעות: {{4}}`,
    templateTextEn: `{{1}}, you're invited to {{2}}!
RSVP: {{3}}
Transportation: {{4}}`,
  },
];

/**
 * Confirmation Templates (RSVP confirmation)
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle, {{3}} = rsvpStatus
 */
export const WHATSAPP_CONFIRMATION_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "CONFIRMATION",
    style: "style1",
    nameHe: "סגנון 1",
    nameEn: "Style 1",
    twilioTemplateName: "wedinex_confirmation_formal",
    templateTextHe: `שלום {{1}},

תשובתכם ל{{2}} התקבלה בהצלחה.

תודה רבה`,
    templateTextEn: `Dear {{1}},

Your RSVP for {{2}} has been received.

Thank you`,
  },
  {
    type: "CONFIRMATION",
    style: "style2",
    nameHe: "סגנון 2",
    nameEn: "Style 2",
    twilioTemplateName: "wedinex_confirmation_friendly",
    templateTextHe: `היי {{1}}! ✅

קיבלנו את התשובה שלך ל{{2}}!
תודה שעדכנת אותנו 💕`,
    templateTextEn: `Hey {{1}}! ✅

Got your RSVP for {{2}}!
Thanks for letting us know 💕`,
  },
  {
    type: "CONFIRMATION",
    style: "style3",
    nameHe: "סגנון 3",
    nameEn: "Style 3",
    twilioTemplateName: "wedinex_confirmation_short",
    templateTextHe: `{{1}}, קיבלנו את תשובתך ל{{2}}. תודה! ✅`,
    templateTextEn: `{{1}}, your RSVP for {{2}} received. Thanks! ✅`,
  },
];

/**
 * Event Day Templates (morning of event reminder)
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle, {{3}} = tableName, {{4}} = venue/address, {{5}} = navigationUrl, {{6}} = giftLink
 */
export const WHATSAPP_EVENT_DAY_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "EVENT_DAY",
    style: "style1",
    nameHe: "סגנון 1",
    nameEn: "Style 1",
    twilioTemplateName: "wedinex_event_day_formal",
    existingContentSid: "HX80e0ff2024fb29d65878e002df31afd3",
    templateTextHe: `שלום {{1}} 👋

מזכירים לכם שהיום החתונה של {{2}}! 🎉

🪑 השולחן שלכם: {{3}}

📍 מיקום האירוע:
{{4}}

🗺️ לניווט: {{5}}

💳 רוצים להעניק לזוג מתנה? {{6}}

מחכים לראות אתכם! ❤️`,
    templateTextEn: `Hello {{1}} 👋

Reminder that {{2}} is today! 🎉

🪑 Your table: {{3}}

📍 Event location:
{{4}}

🗺️ Navigation: {{5}}

💳 Want to give a gift? {{6}}

Looking forward to seeing you! ❤️`,
  },
  {
    type: "EVENT_DAY",
    style: "style2",
    nameHe: "סגנון 2",
    nameEn: "Style 2",
    twilioTemplateName: "wedinex_event_day_friendly",
    templateTextHe: `היי {{1}}! 🎉

היום זה היום! {{2}} מתחיל!

🪑 שולחן: {{3}}
📍 מיקום: {{4}}
🗺️ ניווט: {{5}}
💳 מתנה: {{6}}

נתראה בקרוב! 💃🕺`,
    templateTextEn: `Hey {{1}}! 🎉

Today's the day! {{2}} is happening!

🪑 Table: {{3}}
📍 Venue: {{4}}
🗺️ Navigation: {{5}}
💳 Gift: {{6}}

See you soon! 💃🕺`,
  },
  {
    type: "EVENT_DAY",
    style: "style3",
    nameHe: "סגנון 3",
    nameEn: "Style 3",
    twilioTemplateName: "wedinex_event_day_short",
    templateTextHe: `{{1}}, מתראים היום! 🪑{{3}} 📍{{4}}`,
    templateTextEn: `{{1}}, see you today! 🪑{{3}} 📍{{4}}`,
  },
];

/**
 * Thank You Templates (day after event)
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle
 */
export const WHATSAPP_THANK_YOU_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "THANK_YOU",
    style: "style1",
    nameHe: "סגנון 1",
    nameEn: "Style 1",
    twilioTemplateName: "wedinex_thank_you_formal",
    existingContentSid: "HX2e0cc26147f657e88a902b48349158b7",
    templateTextHe: `שלום {{1}},

תודה רבה על השתתפותכם ב{{2}}.

נהנינו מאוד מנוכחותכם וממתנתכם.

בברכה`,
    templateTextEn: `Dear {{1}},

Thank you so much for attending {{2}}.

We truly enjoyed having you celebrate with us.

Best regards`,
  },
  {
    type: "THANK_YOU",
    style: "style2",
    nameHe: "סגנון 2",
    nameEn: "Style 2",
    twilioTemplateName: "wedinex_thank_you_friendly",
    templateTextHe: `היי {{1}}! 💕

תודה ענקית שהייתם איתנו ב{{2}}!
היה מדהים לחגוג יחד! 🥰

אהבה גדולה`,
    templateTextEn: `Hey {{1}}! 💕

Huge thanks for being with us at {{2}}!
It was amazing celebrating together! 🥰

Much love`,
  },
  {
    type: "THANK_YOU",
    style: "style3",
    nameHe: "סגנון 3",
    nameEn: "Style 3",
    twilioTemplateName: "wedinex_thank_you_short",
    templateTextHe: `{{1}}, תודה שהייתם ב{{2}}! 💕`,
    templateTextEn: `{{1}}, thanks for being at {{2}}! 💕`,
  },
];

/**
 * Table Assignment Templates
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle, {{3}} = tableName
 */
export const WHATSAPP_TABLE_ASSIGNMENT_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "TABLE_ASSIGNMENT",
    style: "style1",
    nameHe: "סגנון 1",
    nameEn: "Style 1",
    twilioTemplateName: "wedinex_table_assignment_formal",
    templateTextHe: `שלום {{1}},

שיבוץ המקומות ל{{2}}:
{{3}}

נתראה בקרוב!`,
    templateTextEn: `Dear {{1}},

Your seating assignment for {{2}}:
{{3}}

See you soon!`,
  },
  {
    type: "TABLE_ASSIGNMENT",
    style: "style2",
    nameHe: "סגנון 2",
    nameEn: "Style 2",
    twilioTemplateName: "wedinex_table_assignment_friendly",
    templateTextHe: `היי {{1}}! 🪑

קיבלתם מקום ב{{2}}!
{{3}}

נתראה! 🎉`,
    templateTextEn: `Hey {{1}}! 🪑

You've got your seat for {{2}}!
{{3}}

See you there! 🎉`,
  },
  {
    type: "TABLE_ASSIGNMENT",
    style: "style3",
    nameHe: "סגנון 3",
    nameEn: "Style 3",
    twilioTemplateName: "wedinex_table_assignment_short",
    templateTextHe: `{{1}}, {{3}} ב{{2}} 🪑`,
    templateTextEn: `{{1}}, {{3}} at {{2}} 🪑`,
  },
];

/**
 * Guest Count List Templates (interactive list for selecting guest count)
 * Placeholders: {{1}} = guestName, {{2}} = eventTitle
 * Note: Has interactive list buttons for guest count selection
 */
export const WHATSAPP_GUEST_COUNT_LIST_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    type: "GUEST_COUNT_LIST",
    style: "style1",
    nameHe: "סגנון 1",
    nameEn: "Style 1",
    twilioTemplateName: "wedinex_guest_count_formal",
    existingContentSid: "HX4322c2482da4bce43d001668b83234a6",
    templateTextHe: `שלום {{1}},

נודה אם תעדכנו אותנו כמה אורחים יגיעו ל{{2}}.

אנא בחרו מהרשימה למטה.`,
    templateTextEn: `Dear {{1}},

Please let us know how many guests will be attending {{2}}.

Please select from the list below.`,
  },
  {
    type: "GUEST_COUNT_LIST",
    style: "style2",
    nameHe: "סגנון 2",
    nameEn: "Style 2",
    twilioTemplateName: "wedinex_guest_count_friendly",
    templateTextHe: `היי {{1}}! 👥

כמה תהיו ב{{2}}?
בחרו למטה 😊`,
    templateTextEn: `Hey {{1}}! 👥

How many of you are coming to {{2}}?
Choose below 😊`,
  },
  {
    type: "GUEST_COUNT_LIST",
    style: "style3",
    nameHe: "סגנון 3",
    nameEn: "Style 3",
    twilioTemplateName: "wedinex_guest_count_short",
    templateTextHe: `{{1}}, כמה מגיעים ל{{2}}?`,
    templateTextEn: `{{1}}, how many coming to {{2}}?`,
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
    case "IMAGE_INVITE":
      return WHATSAPP_IMAGE_INVITE_TEMPLATES;
    case "TRANSPORTATION_INVITE":
      return WHATSAPP_TRANSPORTATION_INVITE_TEMPLATES;
    case "CONFIRMATION":
      return WHATSAPP_CONFIRMATION_TEMPLATES;
    case "EVENT_DAY":
      return WHATSAPP_EVENT_DAY_TEMPLATES;
    case "THANK_YOU":
      return WHATSAPP_THANK_YOU_TEMPLATES;
    case "TABLE_ASSIGNMENT":
      return WHATSAPP_TABLE_ASSIGNMENT_TEMPLATES;
    case "GUEST_COUNT_LIST":
      return WHATSAPP_GUEST_COUNT_LIST_TEMPLATES;
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
  ...WHATSAPP_IMAGE_INVITE_TEMPLATES,
  ...WHATSAPP_TRANSPORTATION_INVITE_TEMPLATES,
  ...WHATSAPP_CONFIRMATION_TEMPLATES,
  ...WHATSAPP_EVENT_DAY_TEMPLATES,
  ...WHATSAPP_THANK_YOU_TEMPLATES,
  ...WHATSAPP_TABLE_ASSIGNMENT_TEMPLATES,
  ...WHATSAPP_GUEST_COUNT_LIST_TEMPLATES,
];
