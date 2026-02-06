/**
 * SMS Template Presets
 *
 * Default SMS templates for each message type and style
 * Based on WhatsApp templates but simplified for SMS (no interactive buttons)
 * Uses same 12-variable system as WhatsApp templates
 */

export type SmsTemplateType = "INVITE" | "REMINDER" | "EVENT_DAY" | "THANK_YOU";
export type SmsTemplateStyle = "style1" | "style2" | "style3";

export interface SmsTemplatePreset {
  type: SmsTemplateType;
  style: SmsTemplateStyle;
  nameHe: string;
  nameEn: string;
  messageBodyHe: string;
  messageBodyEn: string;
  variables: Record<string, string>;
}

/**
 * Default SMS template presets
 * Style descriptions:
 * - style1: Normal (רגיל) - Simple, concise message
 * - style2: Informative (מפורט) - Detailed with all event info
 * - style3: Transportation (הסעות) - Includes transportation link
 */
export const SMS_TEMPLATE_PRESETS: SmsTemplatePreset[] = [
  // ========================================
  // INVITE Templates
  // ========================================
  {
    type: "INVITE",
    style: "style1",
    nameHe: "הזמנה רגילה - סגנון רגיל",
    nameEn: "Standard Invite - Normal Style",
    messageBodyHe: `היי {{1}} 👋

אנחנו ממש מתרגשים להזמין אותך לחגוג איתנו את {{2}}!

נשמח מאוד לראות אותך שם 💙

לאישור הגעה ופרטים נוספים:
{{11}}

מחכים לך בשמחה!`,
    messageBodyEn: `Hey {{1}} 👋

We're so excited to invite you to celebrate {{2}} with us!

We'd love to see you there 💙

To confirm attendance and more details:
{{11}}

Looking forward to celebrating with you!`,
    variables: {
      "1": "Guest Name",
      "2": "Event Title",
      "11": "RSVP Link",
    },
  },
  {
    type: "INVITE",
    style: "style2",
    nameHe: "הזמנה רגילה - סגנון מפורט",
    nameEn: "Standard Invite - Informative Style",
    messageBodyHe: `שלום {{1}}! 💌

אנחנו מזמינים אותך לחגוג איתנו את {{2}}

📅 מתי: {{5}}, {{6}}
📍 איפה: {{3}}, {{4}}

נשמח לראות אותך! 🎉

לאישור הגעה:
{{11}}

תודה ומחכים לך!`,
    messageBodyEn: `Hello {{1}}! 💌

We're inviting you to celebrate {{2}} with us

📅 When: {{5}}, {{6}}
📍 Where: {{3}}, {{4}}

We'd love to see you! 🎉

To confirm:
{{11}}

Thank you and see you soon!`,
    variables: {
      "1": "Guest Name",
      "2": "Event Title",
      "3": "Venue Name",
      "4": "Venue Address",
      "5": "Event Date",
      "6": "Event Time",
      "11": "RSVP Link",
    },
  },
  {
    type: "INVITE",
    style: "style3",
    nameHe: "הזמנה רגילה - כולל הסעות",
    nameEn: "Standard Invite - With Transportation",
    messageBodyHe: `שלום {{1}}! 💌

אנחנו מזמינים אותך לחגוג איתנו את {{2}}

📅 {{5}}, {{6}}
📍 {{3}}, {{4}}

🚌 רישום להסעות:
{{9}}

🗺 ניווט למקום:
{{7}}

לאישור הגעה:
{{11}}

מחכים לך!`,
    messageBodyEn: `Hello {{1}}! 💌

We're inviting you to celebrate {{2}} with us

📅 {{5}}, {{6}}
📍 {{3}}, {{4}}

🚌 Transportation registration:
{{9}}

🗺 Navigation:
{{7}}

To confirm:
{{11}}

See you there!`,
    variables: {
      "1": "Guest Name",
      "2": "Event Title",
      "3": "Venue Name",
      "4": "Venue Address",
      "5": "Event Date",
      "6": "Event Time",
      "7": "Navigation URL",
      "9": "Transportation Link",
      "11": "RSVP Link",
    },
  },

  // ========================================
  // REMINDER Templates
  // ========================================
  {
    type: "REMINDER",
    style: "style1",
    nameHe: "תזכורת - סגנון רגיל",
    nameEn: "Reminder - Normal Style",
    messageBodyHe: `היי {{1}}! 👋

רק רצינו להזכיר לך על {{2}} שמתקרב! 🎊

עדיין לא אישרת הגעה - נשמח לדעת אם תגיע/י

אישור הגעה:
{{11}}

מחכים לך! 💫`,
    messageBodyEn: `Hey {{1}}! 👋

Just a reminder about {{2}} coming up! 🎊

You haven't confirmed yet - we'd love to know if you're coming

Confirm attendance:
{{11}}

See you there! 💫`,
    variables: {
      "1": "Guest Name",
      "2": "Event Title",
      "11": "RSVP Link",
    },
  },
  {
    type: "REMINDER",
    style: "style2",
    nameHe: "תזכורת - סגנון מפורט",
    nameEn: "Reminder - Informative Style",
    messageBodyHe: `{{1}}, שלום! ⏰

{{2}} כבר קרוב!

📅 {{5}}
📍 {{3}}, {{4}}
🕐 {{6}}

עדיין לא אישרת - נשמח לדעת אם תגיע/י 🎉

אישור הגעה:
{{11}}

תודה ומחכים!`,
    messageBodyEn: `{{1}}, Hello! ⏰

{{2}} is coming soon!

📅 {{5}}
📍 {{3}}, {{4}}
🕐 {{6}}

Haven't heard from you - please let us know! 🎉

Confirm:
{{11}}

Thanks!`,
    variables: {
      "1": "Guest Name",
      "2": "Event Title",
      "3": "Venue Name",
      "4": "Venue Address",
      "5": "Event Date",
      "6": "Event Time",
      "11": "RSVP Link",
    },
  },
  {
    type: "REMINDER",
    style: "style3",
    nameHe: "תזכורת - כולל הסעות",
    nameEn: "Reminder - With Transportation",
    messageBodyHe: `{{1}}, תזכורת! ⏰

{{2}} - {{5}}

📍 {{3}}, {{4}}
🕐 {{6}}

🚌 רישום להסעות: {{9}}
🗺 ניווט: {{7}}

אישור הגעה: {{11}}

מחכים לך!`,
    messageBodyEn: `{{1}}, Reminder! ⏰

{{2}} - {{5}}

📍 {{3}}, {{4}}
🕐 {{6}}

🚌 Transportation: {{9}}
🗺 Navigation: {{7}}

Confirm: {{11}}

See you!`,
    variables: {
      "1": "Guest Name",
      "2": "Event Title",
      "3": "Venue Name",
      "4": "Venue Address",
      "5": "Event Date",
      "6": "Event Time",
      "7": "Navigation URL",
      "9": "Transportation Link",
      "11": "RSVP Link",
    },
  },

  // ========================================
  // EVENT_DAY Templates
  // ========================================
  {
    type: "EVENT_DAY",
    style: "style1",
    nameHe: "יום האירוע - סגנון רגיל",
    nameEn: "Event Day - Normal Style",
    messageBodyHe: `בוקר טוב {{1}}! ☀️

היום הגדול הגיע - {{2}} היום! 🎊

📍 {{3}}, {{4}}
🕐 {{6}}
🪑 שולחן {{8}}

💳 מתנה דיגיטלית:
{{12}}

🗺 ניווט למקום:
{{7}}

מצפים לראותך! 💫`,
    messageBodyEn: `Good morning {{1}}! ☀️

The big day is here - {{2}} today! 🎊

📍 {{3}}, {{4}}
🕐 {{6}}
🪑 Table {{8}}

💳 Digital gift:
{{12}}

🗺 Navigation:
{{7}}

See you soon! 💫`,
    variables: {
      "1": "Guest Name",
      "2": "Event Title",
      "3": "Venue Name",
      "4": "Venue Address",
      "6": "Event Time",
      "7": "Navigation URL",
      "8": "Table Number",
      "12": "Gift Payment URL",
    },
  },
  {
    type: "EVENT_DAY",
    style: "style2",
    nameHe: "יום האירוע - סגנון מפורט",
    nameEn: "Event Day - Informative Style",
    messageBodyHe: `{{1}}, היום! 🎊

{{2}} מתחיל!

🪑 שולחן {{8}}
📍 {{3}}, {{4}}
🕐 {{6}}

💳 מתנה: {{12}}

🗺 ניווט:
{{7}}

נתראה! 💃`,
    messageBodyEn: `{{1}}, Today! 🎊

{{2}} starts now!

🪑 Table {{8}}
📍 {{3}}, {{4}}
🕐 {{6}}

💳 Gift: {{12}}

🗺 Navigation:
{{7}}

See you! 💃`,
    variables: {
      "1": "Guest Name",
      "2": "Event Title",
      "3": "Venue Name",
      "4": "Venue Address",
      "6": "Event Time",
      "7": "Navigation URL",
      "8": "Table Number",
      "12": "Gift Payment URL",
    },
  },
  {
    type: "EVENT_DAY",
    style: "style3",
    nameHe: "יום האירוע - סגנון מהיר",
    nameEn: "Event Day - Quick Style",
    messageBodyHe: `{{1}}, {{2}} היום! 🪑{{8}} 📍{{4}} 💳{{12}} 🗺{{7}}`,
    messageBodyEn: `{{1}}, {{2}} today! 🪑{{8}} 📍{{4}} 💳{{12}} 🗺{{7}}`,
    variables: {
      "1": "Guest Name",
      "2": "Event Title",
      "4": "Venue Address",
      "7": "Navigation URL",
      "8": "Table Number",
      "12": "Gift Payment URL",
    },
  },

  // ========================================
  // THANK_YOU Templates (Day After Event)
  // ========================================
  {
    type: "THANK_YOU",
    style: "style1",
    nameHe: "תודה - סגנון רגיל",
    nameEn: "Thank You - Normal Style",
    messageBodyHe: `{{1}}, תודה רבה! 💙

היה נפלא לחגוג את {{2}} איתך!

אנחנו אסירי תודה שהגעת והיית חלק מהשמחה שלנו 🎊

באהבה רבה! ✨`,
    messageBodyEn: `{{1}}, Thank you so much! 💙

It was wonderful celebrating {{2}} with you!

We're so grateful you came and were part of our joy 🎊

With love! ✨`,
    variables: {
      "1": "Guest Name",
      "2": "Event Title",
    },
  },
  {
    type: "THANK_YOU",
    style: "style2",
    nameHe: "תודה - עם פידבק",
    nameEn: "Thank You - With Feedback",
    messageBodyHe: `{{1}}, תודה ענקית! 💙

היה נהדר לחגוג את {{2}} איתך!

נשמח לשמוע איך היה לך:
{{7}}

אהבה רבה! 🎊`,
    messageBodyEn: `{{1}}, Thanks so much! 💙

It was great celebrating {{2}} with you!

We'd love to hear your feedback:
{{7}}

Much love! 🎊`,
    variables: {
      "1": "Guest Name",
      "2": "Event Title",
      "7": "Feedback Link",
    },
  },
  {
    type: "THANK_YOU",
    style: "style3",
    nameHe: "תודה - סגנון מהיר",
    nameEn: "Thank You - Quick Style",
    messageBodyHe: `{{1}}, תודה! 💙 נהנינו לחגוג את {{2}} איתך! 🎊✨`,
    messageBodyEn: `{{1}}, Thanks! 💙 Loved celebrating {{2}} with you! 🎊✨`,
    variables: {
      "1": "Guest Name",
      "2": "Event Title",
    },
  },
];

/**
 * Get SMS template preset by type and style
 */
export function getSmsTemplatePreset(
  type: SmsTemplateType,
  style: SmsTemplateStyle
): SmsTemplatePreset | undefined {
  return SMS_TEMPLATE_PRESETS.find(
    (preset) => preset.type === type && preset.style === style
  );
}

/**
 * Get all presets for a specific type
 */
export function getSmsTemplatePresetsByType(
  type: SmsTemplateType
): SmsTemplatePreset[] {
  return SMS_TEMPLATE_PRESETS.filter((preset) => preset.type === type);
}

/**
 * Get style description
 */
export function getSmsStyleDescription(style: SmsTemplateStyle): {
  he: string;
  en: string;
  description: string;
} {
  const descriptions = {
    style1: {
      he: "רגיל",
      en: "Normal",
      description: "Simple, concise message",
    },
    style2: {
      he: "מפורט",
      en: "Informative",
      description: "Detailed with all event information",
    },
    style3: {
      he: "הסעות",
      en: "Transportation",
      description: "Includes transportation and navigation links",
    },
  };

  return descriptions[style];
}
