# WhatsApp Templates Integration Guide for Wedinex

This document provides all WhatsApp message templates for the Wedinex platform and a step-by-step guide for adding them to your Twilio account.

## Table of Contents
1. [Overview](#overview)
2. [Template Types](#template-types)
3. [How to Add Templates to Twilio](#how-to-add-templates-to-twilio)
4. [Template Definitions](#template-definitions)
5. [Updating Content SIDs](#updating-content-sids)

---

## Overview

Wedinex uses WhatsApp messaging through Twilio's Content API to send various types of messages to wedding guests. Each message type has **3 style variations**:

- **Formal**: Professional, respectful tone
- **Friendly**: Warm, casual tone with emojis
- **Short**: Brief, to the point

### Template Placeholders

All templates use Twilio's placeholder system:
- `{{1}}` = Guest Name
- `{{2}}` = Event Title
- `{{3}}` = Context-specific (RSVP link, table name, etc.)
- `{{4}}` = Additional context (Transportation link, etc.)

---

## Template Types

| Type | Description | Placeholders |
|------|-------------|--------------|
| **INVITE** | Standard invitation with RSVP link | {{1}} Name, {{2}} Event, {{3}} RSVP Link |
| **REMINDER** | Gentle reminder with RSVP link | {{1}} Name, {{2}} Event, {{3}} RSVP Link |
| **INTERACTIVE_INVITE** | Invite with Yes/No/Maybe buttons | {{1}} Name, {{2}} Event |
| **INTERACTIVE_REMINDER** | Reminder with Yes/No/Maybe buttons | {{1}} Name, {{2}} Event |
| **IMAGE_INVITE** | Interactive invite with invitation image | {{1}} Name, {{2}} Event |
| **TRANSPORTATION_INVITE** | Formal invite with RSVP + Transportation links | {{1}} Name, {{2}} Event, {{3}} RSVP Link, {{4}} Transportation Link |
| **CONFIRMATION** | RSVP confirmation message | {{1}} Name, {{2}} Event |
| **EVENT_DAY** | Event day reminder (morning of event) | {{1}} Name, {{2}} Event, {{3}} Table, {{4}} Venue, {{5}} Navigation, {{6}} Gift Link |
| **THANK_YOU** | Thank you message (day after event) | {{1}} Name, {{2}} Event |
| **TABLE_ASSIGNMENT** | Table assignment notification | {{1}} Name, {{2}} Event, {{3}} Table Name |
| **GUEST_COUNT_LIST** | Guest count selection (interactive list) | {{1}} Name, {{2}} Event |

---

## How to Add Templates to Twilio

### Step 1: Access Twilio Console
1. Log in to your [Twilio Console](https://www.twilio.com/console)
2. Navigate to **Messaging** → **Content Editor**
3. Click **Create new Content Template**

### Step 2: Create the Template
1. **Select Language**: Choose `Hebrew` or `English` based on the template
2. **Select Type**: Choose `WhatsApp` as the content type
3. **Template Name**: Use the `twilioTemplateName` from the definitions below
4. **Template Body**: Copy the template text exactly as shown

### Step 3: Configure Variables
For each `{{X}}` in the template:
1. Click **Add Variable**
2. Set the variable number (1, 2, 3, 4, etc.)
3. Twilio will automatically detect and configure them

### Step 4: Add Buttons (for Interactive Templates)
For templates with buttons (Interactive/List):
1. Click **Add Button** or **Add List**
2. Configure according to the button specifications below
3. Save the configuration

### Step 5: Submit for Approval
1. Review the template
2. Click **Submit for Approval**
3. Wait for WhatsApp/Meta approval (typically 1-2 business days)

### Step 6: Copy the Content SID
Once approved:
1. Open the approved template
2. Copy the **Content SID** (format: `HXxxxxxxxxxxxxxxxxxxxx`)
3. Update it in the database or configuration

---

## Template Definitions

### 1. INVITE Templates (Standard Invitation with RSVP Link)

#### **INVITE - Formal** ✅ APPROVED
- **Twilio Name**: `copy_wedding_invitation`
- **Content SID**: `HX1a4aaf40cf5f7fd8a9a36f5c83226bd3`

**Hebrew:**
```
שלום {{1}},

אתם מוזמנים בשמחה ל{{2}}.

נודה לכם אם תאשרו את הגעתכם בקישור הבא:
{{3}}

בברכה,
המארגנים
```

**English:**
```
Dear {{1}},

You are cordially invited to {{2}}.

Please confirm your attendance:
{{3}}

Best regards,
The Hosts
```

---

#### **INVITE - Friendly** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_invite_friendly`

**Hebrew:**
```
היי {{1}}! 💍

מזל טוב! מוזמנים ל{{2}}!
נשמח מאוד לראותכם 🎉

אשרו הגעה כאן: {{3}}
```

**English:**
```
Hey {{1}}! 💍

Great news! You're invited to {{2}}!
We'd love to see you there 🎉

RSVP here: {{3}}
```

---

#### **INVITE - Short** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_invite_short`

**Hebrew:**
```
{{1}}, מוזמנים ל{{2}}!
לאישור הגעה: {{3}}
```

**English:**
```
{{1}}, you're invited to {{2}}!
RSVP: {{3}}
```

---

### 2. REMINDER Templates (Gentle Reminder with RSVP Link)

#### **REMINDER - Formal/Gentle** ✅ APPROVED
- **Twilio Name**: `copy_wedding_reminder`
- **Content SID**: `HXb9855ad5e6b9797f3195574a090417ac`

**Hebrew:**
```
שלום {{1}},

רצינו להזכיר שטרם התקבלה תשובתכם להזמנה ל{{2}}.

נודה לכם אם תאשרו את הגעתכם:
{{3}}

תודה רבה
```

**English:**
```
Hi {{1}},

A gentle reminder that we haven't received your RSVP for {{2}}.

Please let us know if you can attend:
{{3}}

Thank you
```

---

#### **REMINDER - Friendly/Casual** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_reminder_friendly`

**Hebrew:**
```
היי {{1}}! 👋

עדיין לא קיבלנו תשובה ל{{2}}.
נשמח לדעת אם מגיעים! 😊

לחצו כאן: {{3}}
```

**English:**
```
Hey {{1}}! 👋

We're still waiting to hear from you about {{2}}.
Would love to know if you're coming! 😊

Click here: {{3}}
```

---

#### **REMINDER - Short/Urgent** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_reminder_short`

**Hebrew:**
```
{{1}}, ממתינים לתשובתך ל{{2}}! ⏰
אשרו כאן: {{3}}
```

**English:**
```
{{1}}, awaiting your response for {{2}}! ⏰
RSVP: {{3}}
```

---

### 3. INTERACTIVE_INVITE Templates (with Yes/No/Maybe Buttons)

#### **INTERACTIVE_INVITE - Formal** ✅ APPROVED
- **Twilio Name**: `interactive_invite_card`
- **Content SID**: `HXff76515d76bbe3e50656ef59bdf90fc6`
- **Buttons**: Quick Reply buttons with IDs: `yes`, `no`, `maybe`

**Hebrew:**
```
שלום {{1}},

אתם מוזמנים בשמחה ל{{2}}.

נודה לכם אם תאשרו את הגעתכם על ידי לחיצה על אחד הכפתורים למטה.

בברכה
```

**English:**
```
Dear {{1}},

You are cordially invited to {{2}}.

Please confirm your attendance by clicking one of the buttons below.

Best regards
```

**Buttons Configuration:**
```
Button 1: "כן, מגיע/ה" / "Yes, I'll attend" (ID: yes)
Button 2: "לא, לצערי" / "No, sorry" (ID: no)
Button 3: "אולי" / "Maybe" (ID: maybe)
```

---

#### **INTERACTIVE_INVITE - Friendly** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_interactive_invite_friendly`
- **Buttons**: Same as above

**Hebrew:**
```
היי {{1}}! 💍✨

מוזמנים ל{{2}}!
נשמח מאוד אם תגיעו לחגוג איתנו 🎉

ספרו לנו - מגיעים?
```

**English:**
```
Hey {{1}}! 💍✨

You're invited to {{2}}!
We'd love to have you celebrate with us 🎉

Let us know - are you coming?
```

---

#### **INTERACTIVE_INVITE - Short** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_interactive_invite_short`
- **Buttons**: Same as above

**Hebrew:**
```
{{1}}, מוזמנים ל{{2}}!
מגיעים?
```

**English:**
```
{{1}}, invited to {{2}}!
Coming?
```

---

### 4. INTERACTIVE_REMINDER Templates (with Yes/No/Maybe Buttons)

#### **INTERACTIVE_REMINDER - Formal/Gentle** ✅ APPROVED
- **Twilio Name**: `interactive_reminder_card`
- **Content SID**: `HXba2294e9683d133dfe92c62692e9d3f2`
- **Buttons**: Same as Interactive Invite

**Hebrew:**
```
שלום {{1}},

רצינו להזכיר שטרם התקבלה תשובתכם להזמנה ל{{2}}.

נודה לתשובתכם על ידי לחיצה על אחד הכפתורים.

תודה רבה
```

**English:**
```
Hi {{1}},

A gentle reminder that we haven't received your RSVP for {{2}}.

Please respond by clicking one of the buttons.

Thank you
```

---

#### **INTERACTIVE_REMINDER - Friendly/Casual** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_interactive_reminder_friendly`
- **Buttons**: Same as above

**Hebrew:**
```
היי {{1}}! 👋

עדיין מחכים לתשובתך ל{{2}}!
נשמח לדעת אם מגיעים 😊

בחרו למטה:
```

**English:**
```
Hey {{1}}! 👋

Still waiting to hear about {{2}}!
Would love to know if you're coming 😊

Choose below:
```

---

#### **INTERACTIVE_REMINDER - Short/Urgent** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_interactive_reminder_short`
- **Buttons**: Same as above

**Hebrew:**
```
{{1}}, ממתינים לתשובתך ל{{2}}! ⏰
```

**English:**
```
{{1}}, awaiting your response for {{2}}! ⏰
```

---

### 5. IMAGE_INVITE Templates (Interactive Invite with Image)

#### **IMAGE_INVITE - Formal** ✅ APPROVED
- **Twilio Name**: `interactive_invite_card`
- **Content SID**: `HXff76515d76bbe3e50656ef59bdf90fc6` (Same as Interactive Invite)
- **Media**: Invitation image URL
- **Buttons**: Same as Interactive Invite

*Same text as INTERACTIVE_INVITE - Formal, but includes an invitation image*

---

#### **IMAGE_INVITE - Friendly** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_image_invite_friendly`
- **Media**: Invitation image URL
- **Buttons**: Same as Interactive Invite

**Hebrew:**
```
היי {{1}}! 💍✨

שלחנו לכם את ההזמנה ל{{2}}!
נשמח מאוד לראותכם 🎉
```

**English:**
```
Hey {{1}}! 💍✨

Here's your invitation to {{2}}!
We'd love to see you there 🎉
```

---

#### **IMAGE_INVITE - Short** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_image_invite_short`
- **Media**: Invitation image URL
- **Buttons**: Same as Interactive Invite

**Hebrew:**
```
{{1}}, מצורפת ההזמנה ל{{2}}!
```

**English:**
```
{{1}}, here's your invitation to {{2}}!
```

---

### 6. TRANSPORTATION_INVITE Templates (Invite with RSVP + Transportation Links) 🆕

#### **TRANSPORTATION_INVITE - Formal** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_transportation_invite_formal`

**Hebrew:**
```
שלום {{1}},

אתם מוזמנים בשמחה ל{{2}}.

נודה לכם אם תאשרו את הגעתכם בקישור הבא:
{{3}}

בנוסף, נשמח לארגן עבורכם הסעות לאירוע. להרשמה להסעות:
{{4}}

בברכה,
המארגנים
```

**English:**
```
Dear {{1}},

You are cordially invited to {{2}}.

Please confirm your attendance:
{{3}}

Additionally, we'd be happy to arrange transportation for you. To register for transportation:
{{4}}

Best regards,
The Hosts
```

---

#### **TRANSPORTATION_INVITE - Friendly** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_transportation_invite_friendly`

**Hebrew:**
```
היי {{1}}! 💍

מזל טוב! מוזמנים ל{{2}}!
נשמח מאוד לראותכם 🎉

אשרו הגעה כאן: {{3}}

רוצים הסעות? 🚐 נשמח לארגן!
הרשמו כאן: {{4}}
```

**English:**
```
Hey {{1}}! 💍

Great news! You're invited to {{2}}!
We'd love to see you there 🎉

RSVP here: {{3}}

Need transportation? 🚐 We'd love to arrange it!
Register here: {{4}}
```

---

#### **TRANSPORTATION_INVITE - Short** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_transportation_invite_short`

**Hebrew:**
```
{{1}}, מוזמנים ל{{2}}!
אישור הגעה: {{3}}
הרשמה להסעות: {{4}}
```

**English:**
```
{{1}}, you're invited to {{2}}!
RSVP: {{3}}
Transportation: {{4}}
```

---

### 7. CONFIRMATION Templates (RSVP Confirmation)

#### **CONFIRMATION - Formal** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_confirmation_formal`

**Hebrew:**
```
שלום {{1}},

תשובתכם ל{{2}} התקבלה בהצלחה.

תודה רבה
```

**English:**
```
Dear {{1}},

Your RSVP for {{2}} has been received.

Thank you
```

---

#### **CONFIRMATION - Friendly** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_confirmation_friendly`

**Hebrew:**
```
היי {{1}}! ✅

קיבלנו את התשובה שלך ל{{2}}!
תודה שעדכנת אותנו 💕
```

**English:**
```
Hey {{1}}! ✅

Got your RSVP for {{2}}!
Thanks for letting us know 💕
```

---

#### **CONFIRMATION - Short** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_confirmation_short`

**Hebrew:**
```
{{1}}, קיבלנו את תשובתך ל{{2}}. תודה! ✅
```

**English:**
```
{{1}}, your RSVP for {{2}} received. Thanks! ✅
```

---

### 8. EVENT_DAY Templates (Morning of Event Reminder)

#### **EVENT_DAY - Formal** ✅ APPROVED
- **Twilio Name**: `wedinex_event_day_formal`
- **Content SID**: `HX80e0ff2024fb29d65878e002df31afd3`

**Hebrew:**
```
שלום {{1}} 👋

מזכירים לכם שהיום החתונה של {{2}}! 🎉

🪑 השולחן שלכם: {{3}}

📍 מיקום האירוע:
{{4}}

🗺️ לניווט: {{5}}

💳 רוצים להעניק לזוג מתנה? {{6}}

מחכים לראות אתכם! ❤️
```

**English:**
```
Hello {{1}} 👋

Reminder that {{2}} is today! 🎉

🪑 Your table: {{3}}

📍 Event location:
{{4}}

🗺️ Navigation: {{5}}

💳 Want to give a gift? {{6}}

Looking forward to seeing you! ❤️
```

---

#### **EVENT_DAY - Friendly** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_event_day_friendly`

**Hebrew:**
```
היי {{1}}! 🎉

היום זה היום! {{2}} מתחיל!

🪑 שולחן: {{3}}
📍 מיקום: {{4}}
🗺️ ניווט: {{5}}
💳 מתנה: {{6}}

נתראה בקרוב! 💃🕺
```

**English:**
```
Hey {{1}}! 🎉

Today's the day! {{2}} is happening!

🪑 Table: {{3}}
📍 Venue: {{4}}
🗺️ Navigation: {{5}}
💳 Gift: {{6}}

See you soon! 💃🕺
```

---

#### **EVENT_DAY - Short** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_event_day_short`

**Hebrew:**
```
{{1}}, מתראים היום! 🪑{{3}} 📍{{4}}
```

**English:**
```
{{1}}, see you today! 🪑{{3}} 📍{{4}}
```

---

### 9. THANK_YOU Templates (Day After Event)

#### **THANK_YOU - Formal** ✅ APPROVED
- **Twilio Name**: `wedinex_thank_you_formal`
- **Content SID**: `HX2e0cc26147f657e88a902b48349158b7`

**Hebrew:**
```
שלום {{1}},

תודה רבה על השתתפותכם ב{{2}}.

נהנינו מאוד מנוכחותכם וממתנתכם.

בברכה
```

**English:**
```
Dear {{1}},

Thank you so much for attending {{2}}.

We truly enjoyed having you celebrate with us.

Best regards
```

---

#### **THANK_YOU - Friendly** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_thank_you_friendly`

**Hebrew:**
```
היי {{1}}! 💕

תודה ענקית שהייתם איתנו ב{{2}}!
היה מדהים לחגוג יחד! 🥰

אהבה גדולה
```

**English:**
```
Hey {{1}}! 💕

Huge thanks for being with us at {{2}}!
It was amazing celebrating together! 🥰

Much love
```

---

#### **THANK_YOU - Short** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_thank_you_short`

**Hebrew:**
```
{{1}}, תודה שהייתם ב{{2}}! 💕
```

**English:**
```
{{1}}, thanks for being at {{2}}! 💕
```

---

### 10. TABLE_ASSIGNMENT Templates (Table Assignment Notification)

#### **TABLE_ASSIGNMENT - Formal** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_table_assignment_formal`

**Hebrew:**
```
שלום {{1}},

שיבוץ המקומות ל{{2}}:
{{3}}

נתראה בקרוב!
```

**English:**
```
Dear {{1}},

Your seating assignment for {{2}}:
{{3}}

See you soon!
```

---

#### **TABLE_ASSIGNMENT - Friendly** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_table_assignment_friendly`

**Hebrew:**
```
היי {{1}}! 🪑

קיבלתם מקום ב{{2}}!
{{3}}

נתראה! 🎉
```

**English:**
```
Hey {{1}}! 🪑

You've got your seat for {{2}}!
{{3}}

See you there! 🎉
```

---

#### **TABLE_ASSIGNMENT - Short** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_table_assignment_short`

**Hebrew:**
```
{{1}}, {{3}} ב{{2}} 🪑
```

**English:**
```
{{1}}, {{3}} at {{2}} 🪑
```

---

### 11. GUEST_COUNT_LIST Templates (Guest Count Selection with Interactive List)

#### **GUEST_COUNT_LIST - Formal** ✅ APPROVED
- **Twilio Name**: `wedinex_guest_count_formal`
- **Content SID**: `HX4322c2482da4bce43d001668b83234a6`
- **List**: Interactive list with options 1-10

**Hebrew:**
```
שלום {{1}},

נודה אם תעדכנו אותנו כמה אורחים יגיעו ל{{2}}.

אנא בחרו מהרשימה למטה.
```

**English:**
```
Dear {{1}},

Please let us know how many guests will be attending {{2}}.

Please select from the list below.
```

**List Configuration:**
```
Title: "כמה אורחים?" / "How many guests?"
Options:
  - "1 אורח" / "1 guest" (value: 1)
  - "2 אורחים" / "2 guests" (value: 2)
  - "3 אורחים" / "3 guests" (value: 3)
  ... (up to 10)
```

---

#### **GUEST_COUNT_LIST - Friendly** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_guest_count_friendly`
- **List**: Same as above

**Hebrew:**
```
היי {{1}}! 👥

כמה תהיו ב{{2}}?
בחרו למטה 😊
```

**English:**
```
Hey {{1}}! 👥

How many of you are coming to {{2}}?
Choose below 😊
```

---

#### **GUEST_COUNT_LIST - Short** ⚠️ NEEDS APPROVAL
- **Twilio Name**: `wedinex_guest_count_short`
- **List**: Same as above

**Hebrew:**
```
{{1}}, כמה מגיעים ל{{2}}?
```

**English:**
```
{{1}}, how many coming to {{2}}?
```

---

## Updating Content SIDs

After templates are approved by WhatsApp/Meta:

### Option 1: Update via Database (Recommended)
```sql
UPDATE "whatsapp_templates"
SET content_sid = 'HXxxxxxxxxxxxxxxxxxxxx'
WHERE type = 'TEMPLATE_TYPE' AND style = 'formal';
```

### Option 2: Update via Admin Panel
1. Navigate to Admin Panel → Messaging
2. Find the template
3. Update the Content SID field
4. Save changes

---

## Testing Templates

### Test in Twilio Console
1. Go to **Messaging** → **Try it out**
2. Select your template
3. Enter test values for variables
4. Send to your test number

### Test in Wedinex
1. Create a test event
2. Add a test guest
3. Send a test message using the template
4. Verify message received correctly

---

## Troubleshooting

### Template Rejected
- Review WhatsApp's [template guidelines](https://developers.facebook.com/docs/whatsapp/message-templates/guidelines)
- Avoid promotional language
- Keep templates informational and transactional
- Ensure correct placeholder syntax

### Template Not Sending
- Verify Content SID is correct
- Check template status is "Approved"
- Confirm phone number is opted in to WhatsApp
- Check Twilio logs for errors

### Variables Not Populating
- Ensure variable numbers match ({{1}}, {{2}}, etc.)
- Check that placeholders are defined in Twilio template
- Verify the correct number of variables is being passed

---

## Support

For issues with templates or Twilio integration:
- Twilio Support: https://support.twilio.com
- WhatsApp Business Platform: https://developers.facebook.com/docs/whatsapp

---

**Last Updated**: February 2026
**Version**: 1.0.0
