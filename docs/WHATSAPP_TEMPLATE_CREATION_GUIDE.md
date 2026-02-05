# WhatsApp Template Creation Guide - Wedinex

## Overview

This guide contains all WhatsApp message templates for the Wedinex platform. Each template type has 3 styles with varying levels of detail.

## 🆕 Creating Templates with Wedinex V3 Dialog

### Automated Template Creation Process

Wedinex now includes a **powerful Template Creation Dialog (V3)** that streamlines the entire template creation process with a simple 2-step workflow.

#### How to Access
1. Go to: **Admin Panel** → **Messaging** → **WhatsApp Templates**
2. Click: **"Create Template"** button
3. Use the **2-step wizard** to create and submit templates

---

### Step 1: Template Configuration

**What You'll Choose:**

1. **Create Template For:** (Required)
   - Dropdown with all 30 template combinations
   - Format: `[Type] - [Style]`
   - Example: "הזמנה רגילה - סגנון 1 (מינימלי)"
   - Automatically sets template type and style

2. **Twilio Template Name:** (Auto-Generated)
   - Automatically filled when you select template type
   - Format: `wedinex_{type}_{style}_he`
   - Example: `wedinex_invite_1_he`
   - Can be manually edited if needed

3. **Content Type:** (Required)
   - `twilio/quick-reply` - Interactive buttons
   - `twilio/text` - Plain text message
   - `twilio/media` - Image/Video/Document
   - `twilio/list-picker` - Selection list
   - `twilio/card` - Rich card format

4. **Category:** (Required)
   - `UTILITY` - General business updates (recommended)
   - `MARKETING` - Promotional content
   - `AUTHENTICATION` - OTP codes

5. **Language:** (Read-Only)
   - Currently: **Hebrew only** (עברית)
   - English support coming soon

6. **Media Header:** (Optional - For Interactive Templates Only)
   - Toggle ON/OFF
   - Available for `twilio/quick-reply` templates
   - Select media type: Image/Video/Document
   - Uses variable `{{3}}` for Cloudinary URL
   - Format: `https://res.cloudinary.com/{{3}}`

**Click "הבא" (Next)** to proceed to Step 2.

---

### Step 2: Template Content

**What You'll Create:**

1. **Selected Template Summary**
   - Shows your selected template name
   - Displays the auto-generated Twilio name
   - Visual confirmation before content creation

2. **Auto-Generate Professional Message** ✨
   - Click **"צור הודעה מקצועית"** button
   - Instantly generates:
     - Professional Hebrew message body
     - All required variables (`{{1}}` to `{{9}}`)
     - Preview text for the send dialog
     - Appropriate tone for the template type
   - Based on proven templates from this guide

3. **Message Content Fields:**
   - **Template Body** (Required) - Main message text
   - **Header Text** (Optional) - Message header
   - **Footer Text** (Optional) - Message footer
   - **Preview Text** (Optional) - Text shown in send dialog

4. **Interactive Buttons** (For Quick Reply Templates)
   - Configure up to 3 buttons
   - Default buttons: "כן, מגיע" / "לא מגיע" / "אולי"
   - Each button: Hebrew title (max 20 chars) + ID

5. **Variable Helper**
   - Shows recommended variables for your template type
   - Explains what each variable represents
   - Copy-paste ready format

6. **Live Validation**
   - Real-time error checking
   - Character count tracking
   - WhatsApp compliance verification
   - Prevents common mistakes

7. **Live Preview**
   - See how your message will look
   - Sample data shows variable replacement
   - Mobile-like preview interface

**Click "צור ושלח לאישור"** to create and submit.

---

### What Happens After Submission

1. **Database Creation**
   - Template saved to Wedinex database
   - Status: `DRAFT` → `PENDING`

2. **Twilio Submission**
   - Automatically submitted to Twilio Content API
   - Forwarded to WhatsApp/Meta for approval

3. **Approval Tracking**
   - Monitor status in templates table
   - Use "Check Status" button to refresh
   - Use "Sync Pending" to batch-check all pending templates

4. **WhatsApp Review**
   - Usually takes 1-3 business days
   - May request changes if policy violations
   - Auto-updates in Wedinex when approved

5. **Ready to Use**
   - Once approved: Status becomes `APPROVED`
   - Template appears in send message dialogs
   - Can be used for bulk messaging

---

### Template Naming Convention (Auto-Generated)

The V3 dialog automatically generates names following this format:

**Format:** `wedinex_{type}_{style}_he`

**Examples:**
- `wedinex_invite_1_he` - Invite Style 1 (Hebrew)
- `wedinex_invite_2_he` - Invite Style 2 (Hebrew)
- `wedinex_invite_3_he` - Invite Style 3 with Transportation (Hebrew)
- `wedinex_reminder_1_he` - Reminder Style 1 (Hebrew)
- `wedinex_interactive_invite_1_he` - Interactive Invite Style 1 (Hebrew)
- `wedinex_confirmation_he` - Confirmation (Hebrew)

**Display Names (Auto-Generated):**
- Hebrew: "הזמנה רגילה - סגנון 1 (מינימלי)"
- English: "Standard Invite - Style 1 (Minimal)"

---

### Media Header Feature (Interactive Templates)

When creating **Interactive Invite** or **Interactive Reminder** templates, you can add an optional **Media Header**:

**Configuration:**
1. In Step 1, enable "כותרת מדיה (Media Header)" toggle
2. Select media type: Image/Video/Document
3. Variable `{{3}}` will be used for the Cloudinary path

**URL Format:**
```
https://res.cloudinary.com/{{3}}
```

**Example Variable Value:**
```
invitations/wedding_invite.jpg
```

**Full URL Result:**
```
https://res.cloudinary.com/invitations/wedding_invite.jpg
```

**Important Notes:**
- ⚠️ Ensure media file exists in Cloudinary before sending
- Variable `{{3}}` is used ONLY in the header section for media URL
- **Template body must use {{4}} for venue** (not {{3}}) when media is enabled
- {{4}} automatically combines venue name + address when media header is used
- Combines visual appeal with interactive buttons

**Example Template WITH Media Header:**
```
Header: [IMAGE from {{3}}]
Body:
שלום {{1}} 💌

מוזמנים לחגוג את {{2}}!

📍 איפה: {{4}}
📅 מתי: {{5}} בשעה {{6}}

לפרטים נוספים:
{{7}}
```

**Example Template WITHOUT Media Header:**
```
Body:
שלום {{1}} 💌

מוזמנים לחגוג את {{2}}!

📍 איפה: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

לפרטים נוספים:
{{7}}
```

---

### Key Features ✨

#### Platform Features (V3 Dialog)
- **🤖 Auto-Generation**: One-click professional message creation
- **📱 Live Preview**: See exactly how messages will look
- **✅ Real-Time Validation**: Prevent errors before submission
- **📊 Approval Tracking**: Monitor WhatsApp approval status
- **🖼️ Media Headers**: Add images/videos to interactive templates
- **🎯 Smart Variables**: Automatic variable mapping and hints

#### Template Features
- **9-Variable System**: Each piece of information has its own variable for maximum flexibility
- **Human & Friendly Tone**: Natural, warm Hebrew that sounds personal, not robotic
- **Strategic Emoji Use**: 1-3 emojis per template to add warmth without overwhelming
- **Three Style Levels**: Minimal, detailed, and transportation-focused options
- **Fully Dynamic**: No manual text entry needed - everything pulls from your database
- **Interactive Support**: Quick-reply buttons and list pickers
- **Media Support**: Images, videos, and documents in templates

### Template Styles Philosophy

- **Style 1**: Minimal and warm - includes only essential information
- **Style 2**: Detailed and informative - includes venue details, address, time, and navigation link
- **Style 3**: Detailed with transportation - same as Style 2 plus transportation registration link

### Variable Reference

All templates use Twilio variable placeholders (each detail has its own variable):
- `{{1}}` = Guest Name (שם האורח) - e.g., "דני", "משפחת כהן"
- `{{2}}` = Event Title (שם האירוע) - e.g., "חתונת דני ושרה", "בר מצווה של יוסי"
- `{{3}}` = **Context-Dependent:**
  - **With Media Header:** Media URL Path - e.g., "invitations/wedding.jpg"
  - **Without Media:** Venue Name (שם המקום) - e.g., "אולם מאגיה", "גן אירועים הדקל"
- `{{4}}` = Venue Address (כתובת מלאה) - e.g., "רחוב החשמל 5, טבריה"
- `{{5}}` = Event Date (תאריך) - e.g., "יום שישי, 15 במרץ"
- `{{6}}` = Event Time (שעה) - e.g., "20:00", "שבע בערב"
- `{{7}}` = **Dynamic Link** (קישור דינמי) - Context-dependent:
  - **INVITE/REMINDER:** RSVP Link - e.g., "https://wedinex.co/r/abc123"
  - **INTERACTIVE templates:** Navigation Link (Waze/Google Maps) - e.g., "https://waze.com/ul?q=..."
  - **CONFIRMATION:** Navigation Link - e.g., "https://maps.google.com/?q=..."
- `{{8}}` = Table Number (מספר שולחן) - e.g., "12", "VIP-3"
- `{{9}}` = **Transportation Link** (קישור רישום להסעות) - e.g., "https://wedinex.co/t/abc123"

**Important Notes:**
- Not all templates use all variables. Use only what's needed for each template type.
- **{{7}} is ALWAYS the RSVP link** - used in all invitation and reminder templates
- **{{9}} is for Transportation** - used only in Style 3 templates (with transportation focus)
- Style 3 templates can include **BOTH** {{7}} (RSVP) and {{9}} (Transportation)
- When **Media Header is enabled** in interactive templates, `{{3}}` becomes the Cloudinary media path instead of venue name.
- The system automatically handles variable mapping based on template configuration.

### Example: How Variables Work

Here's an INVITE Style 2 template with real data:

**Template**:
```
שלום {{1}} 🎉

מוזמנים לחגוג איתנו את {{2}}!

📍 היכן? {{3}}, {{4}}
📅 מתי? {{5}} בשעה {{6}}
```

**Becomes**:
```
שלום משפחת כהן 🎉

מוזמנים לחגוג איתנו את חתונת דני ושרה!

📍 היכן? אולם מאגיה, רחוב החשמל 5, טבריה
📅 מתי? יום שישי, 15 במרץ 2026 בשעה 20:00
```

---

### Important Notes

1. **WhatsApp Character Limits**:
   - Template body: Max 1024 characters
   - Button text: Max 20 characters
   - Variables cannot be at the very start or end of the template

2. **Approval Process**:
   - All templates must be approved by Meta/WhatsApp
   - Use MARKETING category for invites/reminders
   - Keep tone friendly and professional
   - Approval usually takes 1-3 business days

3. **Hebrew RTL**:
   - All templates are in Hebrew (right-to-left)
   - Use proper Hebrew punctuation and spacing
   - Emojis work well with RTL text

---

## 1. INVITE Templates (הזמנות)

### Style 1 - Minimal & Warm

```
היי {{1}} 👋

אנחנו ממש מתרגשים להזמין אותך לחגוג איתנו את {{2}}!

נשמח מאוד לראות אותך שם 💙

לאישור הגעה ופרטים נוספים:
{{7}}

מחכים לך בשמחה!
```

**Content Type**: `twilio/text`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{7}} RSVP Link

---

### Style 2 - Detailed & Informative

```
שלום {{1}} 🎉

מוזמנים לחגוג איתנו את {{2}}!

📍 היכן? {{3}}, {{4}}

📅 מתי? {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

נשמח לאישור הגעה כדי שנוכל לתכנן בשבילך את הערב המושלם.

מצפים לראותכם! 💫
```

**Content Type**: `twilio/text`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{3}} Venue Name, {{4}} Address, {{5}} Date, {{6}} Time, {{7}} Navigation Link

---

### Style 3 - Detailed with Transportation

```
שלום {{1}} 🎉

מוזמנים לחגוג איתנו את {{2}}!

📍 היכן? {{3}}, {{4}}

📅 מתי? {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

🚌 דאגנו לכם להסעות נוחות! לרישום להסעה:
{{9}}

נשמח לאישור הגעה כדי שנוכל לתכנן בשבילך את הערב המושלם.

מצפים לראותכם! 💫
```

**Content Type**: `twilio/text`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{3}} Venue Name, {{4}} Address, {{5}} Date, {{6}} Time, {{7}} RSVP Link, {{9}} Transportation Link

---

## 2. REMINDER Templates (תזכורות)

### Style 1 - Minimal & Warm

```
היי {{1}} ⏰

רק רצינו להזכיר - {{2}} כבר ממש קרוב!

עדיין מחכים לאישור ההגעה שלך 💙

לחצו כאן:
{{7}}

נתראה בקרוב!
```

**Content Type**: `twilio/text`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{7}} RSVP Link

---

### Style 2 - Detailed & Informative

```
שלום {{1}} 📢

תזכורת חמה - {{2}} כבר ממש מתקרב!

📍 המקום: {{3}}, {{4}}

📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

אם עדיין לא אישרת הגעה, נשמח שתעשה זאת עכשיו כדי שנוכל לדאוג לכל הפרטים בשבילך.

מצפים לראותכם! ✨
```

**Content Type**: `twilio/text`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{3}} Venue Name, {{4}} Address, {{5}} Date, {{6}} Time, {{7}} RSVP Link

---

### Style 3 - Detailed with Transportation

```
שלום {{1}} 📢

תזכורת חמה - {{2}} כבר ממש מתקרב!

📍 המקום: {{3}}, {{4}}

📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

🚌 רוצים הסעה? נשמח לראותכם! לרישום:
{{9}}

אם עדיין לא אישרת הגעה, נשמח שתעשה זאת עכשיו כדי שנוכל לדאוג לכל הפרטים בשבילך.

מצפים לראותכם! ✨
```

**Content Type**: `twilio/text`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{3}} Venue Name, {{4}} Address, {{5}} Date, {{6}} Time, {{7}} RSVP Link, {{9}} Transportation Link

---

## 3. INTERACTIVE_INVITE Templates (הזמנות אינטראקטיביות)

**🆕 Media Header Support:**
All interactive invite templates can optionally include a media header (image/video/document) using the V3 dialog. When enabled, variable `{{3}}` becomes the Cloudinary media URL path instead of venue name.

---

### Style 1 - Minimal with Quick Reply Buttons

**Template Body**:
```
היי {{1}} 🎊

אנחנו ממש שמחים להזמין אותך ל{{2}}!

🗺 ניווט למקום:
{{7}}

נשמח לדעת אם תוכלו להגיע
```

**Content Type**: `twilio/quick-reply`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{7}} Navigation Link

**Quick Reply Buttons** (3 buttons max):
1. `✅ מגיע בשמחה` (id: `confirm`)
2. `❌ לא יכול` (id: `decline`)
3. `🤔 לא בטוח` (id: `maybe`)

---

### Style 2 - Detailed with Quick Reply Buttons

**Template Body**:
```
שלום {{1}} 💌

מוזמנים לחגוג את {{2}}!

📍 איפה: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

נשמח לדעת אם תוכלו להגיע
```

**Content Type**: `twilio/quick-reply`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{3}} Venue Name, {{4}} Address, {{5}} Date, {{6}} Time, {{7}} Navigation Link

**Quick Reply Buttons**:
1. `✅ מאשר הגעה` (id: `confirm`)
2. `❌ לא מגיע` (id: `decline`)
3. `🤔 אולי` (id: `maybe`)

---

### Style 3 - Detailed with Transportation & Quick Reply

**Template Body**:
```
שלום {{1}} 💌

מוזמנים לחגוג את {{2}}!

📍 איפה: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

🚌 יש הסעות! לרישום:
{{9}}

נשמח לדעת אם תוכלו להגיע
```

**Content Type**: `twilio/quick-reply`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{3}} Venue Name, {{4}} Address, {{5}} Date, {{6}} Time, {{7}} Navigation Link, {{9}} Transportation Link

**Quick Reply Buttons**:
1. `✅ מאשר הגעה` (id: `confirm`)
2. `❌ לא מגיע` (id: `decline`)
3. `🤔 אולי` (id: `maybe`)

---

## 4. INTERACTIVE_REMINDER Templates (תזכורות אינטראקטיביות)

**🆕 Media Header Support:**
All interactive reminder templates can optionally include a media header (image/video/document) using the V3 dialog. When enabled, variable `{{3}}` becomes the Cloudinary media URL path instead of venue name.

---

### Style 1 - Minimal with Quick Reply

**Template Body**:
```
היי {{1}} ⏰

תזכורת חמה - {{2}} ממש מתקרב!

🗺 ניווט למקום:
{{7}}

נשמח לדעת אם תוכלו להגיע
```

**Content Type**: `twilio/quick-reply`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{7}} Navigation Link

**Quick Reply Buttons**:
1. `✅ כן, מגיע` (id: `confirm`)
2. `❌ לא יכול` (id: `decline`)
3. `🤔 עוד לא בטוח` (id: `maybe`)

---

### Style 2 - Detailed with Quick Reply

**Template Body**:
```
שלום {{1}} 📢

{{2}} כבר ממש קרוב!

📍 המקום: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

נשמח לדעת אם תוכלו להגיע
```

**Content Type**: `twilio/quick-reply`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{3}} Venue Name, {{4}} Address, {{5}} Date, {{6}} Time, {{7}} Navigation Link

**Quick Reply Buttons**:
1. `✅ מאשר הגעה` (id: `confirm`)
2. `❌ מצטער, לא` (id: `decline`)
3. `🤔 לא בטוח` (id: `maybe`)

---

### Style 3 - Detailed with Transportation & Quick Reply

**Template Body**:
```
שלום {{1}} 📢

{{2}} כבר ממש קרוב!

📍 המקום: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

🚌 יש הסעות! לרישום:
{{9}}

נשמח לדעת אם תוכלו להגיע
```

**Content Type**: `twilio/quick-reply`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{3}} Venue Name, {{4}} Address, {{5}} Date, {{6}} Time, {{7}} Navigation Link, {{9}} Transportation Link

**Quick Reply Buttons**:
1. `✅ מאשר הגעה` (id: `confirm`)
2. `❌ מצטער, לא` (id: `decline`)
3. `🤔 לא בטוח` (id: `maybe`)

---

## 5. IMAGE_INVITE Template (הזמנה עם תמונה)

**Note**: Only one style needed for image invites since the image is the main content.

**Template Body**:
```
היי {{1}} 💌

שמחים להזמין אותך לחגוג איתנו את {{2}}!

לאישור הגעה וכל הפרטים:
{{7}}

מצפים לראותך! ✨
```

**Content Type**: `twilio/media`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{7}} RSVP Link
**Media**: Image URL (provided when sending)

---

## 6. CONFIRMATION Template (אישור RSVP)

**Note**: Sent after guest confirms attendance. One style only.

```
תודה רבה {{1}}! 🎉

קיבלנו את אישור ההגעה שלך ל{{2}}.

אנחנו ממש מתרגשים לחגוג איתך! 💙

📍 המקום: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

נתראה בקרוב בשמחה! ✨
```

**Content Type**: `twilio/text`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{3}} Venue Name, {{4}} Address, {{5}} Date, {{6}} Time, {{7}} Navigation Link

---

## 7. EVENT_DAY Template (יום האירוע)

**Note**: Sent on the day of the event. One style only.

```
בוקר טוב {{1}}! ☀️

היום הגדול הגיע - {{2}} היום! 🎊

📍 איפה: {{3}}, {{4}}
🕐 שעה: {{6}}
🪑 השולחן שלך: מספר {{8}}

🗺 ניווט מהיר למקום:
{{7}}

מצפים לראותך בקרוב ולחגוג ביחד! 💫
```

**Content Type**: `twilio/text`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{3}} Venue Name, {{4}} Address, {{6}} Time, {{7}} Navigation Link, {{8}} Table Number

**Note**: If table not assigned, omit the table line or use conditional logic.

---

## 8. THANK_YOU Template (תודה)

**Note**: Sent after the event. One style only.

```
שלום {{1}} 💙

תודה ענקית שחגגת איתנו את {{2}}!

הנוכחות שלך עשתה את הערב מיוחד ובלתי נשכח 💫

נשמח לשמוע איך היה לך ולקבל פידבק:
{{7}}

בברכה והוקרה רבה,
תודה שהיית חלק מהשמחה שלנו! 🎊
```

**Content Type**: `twilio/text`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{7}} Feedback Link

---

## 9. TABLE_ASSIGNMENT Template (שיבוץ שולחן)

**Note**: Sent when table is assigned. One style only.

```
שלום {{1}} 🪑

שובצת לשולחן באירוע {{2}}!

🪑 השולחן שלך: מספר {{8}}

📍 המקום: {{3}}, {{4}}

🕐 שעת הגעה מומלצת: {{6}}

🗺 ניווט נוח למקום:
{{7}}

נתראה שם! 🎉
```

**Content Type**: `twilio/text`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{3}} Venue Name, {{4}} Address, {{6}} Time, {{7}} Navigation Link, {{8}} Table Number

---

## 10. GUEST_COUNT_LIST Template (ספירת אורחים)

**Note**: Interactive list picker for selecting number of guests.

**Template Body**:
```
שלום {{1}} 👥

כמה אנשים יגיעו איתך ל{{2}}?

נשמח לקבל את המספר המדויק כדי שנוכל להכין את הכל בשבילכם 💙

לפרטים נוספים:
{{7}}

תודה! 🙏
```

**Content Type**: `twilio/list-picker`
**Language**: `he`
**Category**: `MARKETING`
**Variables Used**: {{1}} Guest Name, {{2}} Event Title, {{7}} RSVP Link

**List Picker Configuration**:
- **Button Text**: `בחרו מספר אורחים` (max 20 chars)
- **List Items** (1-10 items):
  1. `אורח אחד` (id: `1`, description: `רק אני מגיע`)
  2. `שני אורחים` (id: `2`, description: `אני + עוד אדם אחד`)
  3. `שלושה אורחים` (id: `3`, description: `אני + עוד 2`)
  4. `ארבעה אורחים` (id: `4`, description: `אני + עוד 3`)
  5. `חמישה אורחים` (id: `5`, description: `אני + עוד 4`)
  6. `יותר מ-5 אורחים` (id: `6+`, description: `משפחה גדולה`)

---

## Creating Templates - Two Methods

### Method 1: Using Wedinex V3 Dialog (Recommended ⭐)

**Fully Automated Process:**

1. **Open Dialog**
   - Admin Panel → Messaging → WhatsApp Templates
   - Click "Create Template" button

2. **Step 1: Configure**
   - Select template type and style from dropdown
   - Template name auto-generated
   - Choose content type, category
   - Enable media header if needed (interactive templates)

3. **Step 2: Create Content**
   - Click "צור הודעה מקצועית" for instant generation
   - Or write custom message body
   - Configure buttons (for interactive templates)
   - Review live preview

4. **Submit**
   - Click "צור ושלח לאישור"
   - Template automatically:
     - Saved to database
     - Submitted to Twilio Content API
     - Forwarded to WhatsApp for approval

5. **Track Approval**
   - Monitor status in templates table
   - Use "Check Status" or "Sync Pending" buttons
   - Auto-updates when approved by WhatsApp

**Advantages:**
- ✅ Automatic template name generation
- ✅ Built-in validation and error checking
- ✅ Live preview with sample data
- ✅ Auto-submission to Twilio
- ✅ Approval status tracking
- ✅ No manual Content SID assignment needed

---

### Method 2: Manual Creation in Twilio Console

**For Advanced Users or Special Cases:**

1. **Login to Twilio Console**
   - Go to: https://console.twilio.com
   - Navigate to: Messaging → Content API → Content Templates

2. **Create New Template**
   - Click "Create new Content Template"
   - Choose appropriate content type

3. **Fill Template Details**
   - **Friendly Name**: Use format `wedinex_{type}_{style}_he`
     - Example: `wedinex_invite_1_he`
   - **Language**: `he` (Hebrew)
   - **Variables**: Define `{{1}}`, `{{2}}`, `{{3}}` with descriptions

4. **Add Content**
   - Copy template body from this guide
   - For interactive templates, add buttons/list items
   - For media headers, configure media URL with `{{3}}`
   - Preview in multiple languages if needed

5. **Submit for Approval**
   - Category: `UTILITY` or `MARKETING`
   - Add sample content for variables
   - Submit to WhatsApp for approval

6. **Wait for Approval**
   - Usually takes 1-3 business days
   - Check status in Twilio console
   - Meta may request changes

7. **Assign to Wedinex**
   - Once approved, copy the Content SID (starts with `HX`)
   - Go to Wedinex Admin → Messaging
   - Click "Assign ContentSid"
   - Select template type and style
   - Paste the Content SID

**When to Use Manual Method:**
- Creating templates not in the standard list
- Testing experimental formats
- Debugging Twilio-specific issues
- Creating templates in other languages (future)

---

## Template Naming Convention

### V3 Dialog Auto-Generated Names (Current)

The V3 dialog automatically generates template names in this format:

**Format:** `wedinex_{type}_{style}_he`

| Template Type | Style | Auto-Generated Name | Display Name (Hebrew) |
|--------------|-------|--------------------|-----------------------|
| INVITE | 1 | `wedinex_invite_1_he` | הזמנה רגילה - סגנון 1 (מינימלי) |
| INVITE | 2 | `wedinex_invite_2_he` | הזמנה רגילה - סגנון 2 (מפורט) |
| INVITE | 3 | `wedinex_invite_3_he` | הזמנה רגילה - סגנון 3 (מפורט + הסעות) |
| REMINDER | 1 | `wedinex_reminder_1_he` | תזכורת רגילה - סגנון 1 (מינימלי) |
| REMINDER | 2 | `wedinex_reminder_2_he` | תזכורת רגילה - סגנון 2 (מפורט) |
| REMINDER | 3 | `wedinex_reminder_3_he` | תזכורת רגילה - סגנון 3 (מפורט + הסעות) |
| INTERACTIVE_INVITE | 1 | `wedinex_interactive_invite_1_he` | הזמנה אינטראקטיבית - סגנון 1 (מינימלי) |
| INTERACTIVE_INVITE | 2 | `wedinex_interactive_invite_2_he` | הזמנה אינטראקטיבית - סגנון 2 (מפורט) |
| INTERACTIVE_INVITE | 3 | `wedinex_interactive_invite_3_he` | הזמנה אינטראקטיבית - סגנון 3 (מפורט + הסעות) |
| INTERACTIVE_REMINDER | 1 | `wedinex_interactive_reminder_1_he` | תזכורת אינטראקטיבית - סגנון 1 (מינימלי) |
| INTERACTIVE_REMINDER | 2 | `wedinex_interactive_reminder_2_he` | תזכורת אינטראקטיבית - סגנון 2 (מפורט) |
| INTERACTIVE_REMINDER | 3 | `wedinex_interactive_reminder_3_he` | תזכורת אינטראקטיבית - סגנון 3 (מפורט + הסעות) |
| IMAGE_INVITE | — | `wedinex_image_invite_he` | הזמנה עם תמונה |
| CONFIRMATION | — | `wedinex_confirmation_he` | אישור RSVP |
| EVENT_DAY | — | `wedinex_event_day_he` | יום האירוע |
| THANK_YOU | — | `wedinex_thank_you_he` | תודה |
| TABLE_ASSIGNMENT | — | `wedinex_table_assignment_he` | שיבוץ שולחן |
| GUEST_COUNT_LIST | — | `wedinex_guest_count_list_he` | ספירת אורחים |

**Notes:**
- All templates currently in Hebrew (`_he` suffix)
- English templates coming soon (`_en` suffix)
- Style numbers: 1 = Minimal, 2 = Detailed, 3 = Detailed + Transportation
- Names are automatically generated when selecting template type in V3 dialog

---

### Legacy Naming (Pre-V3)

For reference, older manually-created templates may use this format:

| Template Type | Style | Legacy Name |
|--------------|-------|-------------|
| INVITE | Style 1 | `wedinex_invite_style1` |
| INVITE | Style 2 | `wedinex_invite_style2` |
| INVITE | Style 3 | `wedinex_invite_style3_transport` |

**Migration:** No action needed - legacy names continue to work.

---

## Variable Mapping Reference

When creating templates in Twilio, define these variables:

| Variable | Name | Description | Example |
|----------|------|-------------|---------|
| `{{1}}` | Guest Name | שם האורח/ת | דני, משפחת כהן, רחל |
| `{{2}}` | Event Title | שם האירוע | חתונת דני ושרה, בר מצווה של יוסי |
| `{{3}}` | **Venue Name OR Media URL** | **Default:** שם המקום<br>**With Media Header:** Cloudinary path (header only) | **Default:** אולם מאגיה, גן אירועים הדקל<br>**With Media:** invitations/wedding.jpg |
| `{{4}}` | **Venue Address OR Combined** | **Default:** כתובת מלאה<br>**With Media Header:** Venue name + address combined | **Default:** רחוב החשמל 5, טבריה<br>**With Media:** אולם מאגיה, רחוב החשמל 5, טבריה |
| `{{5}}` | Event Date | תאריך | יום שישי, 15 במרץ 2026 |
| `{{6}}` | Event Time | שעה | 20:00, שבע בערב |
| `{{7}}` | **RSVP Link** | קישור אישור הגעה | https://wedinex.co/r/abc123 |
| `{{8}}` | Table Number | מספר שולחן | 12, VIP-3, A-5 |
| `{{9}}` | **Transportation Link** | קישור רישום להסעות | https://wedinex.co/t/abc123 |

**Important Notes:**

1. **Variable {{3}} and {{4}} - Context Dependent:**

   **WITHOUT Media Header (Default):**
   - {{3}} = Venue Name (e.g., "אולם מאגיה")
   - {{4}} = Venue Address (e.g., "רחוב החשמל 5, טבריה")
   - Template body: `📍 איפה: {{3}}, {{4}}`

   **WITH Media Header (Interactive Templates):**
   - {{3}} = Media URL path (used in HEADER only, e.g., "invitations/wedding.jpg")
   - {{4}} = Combined venue name + address (e.g., "אולם מאגיה, רחוב החשמל 5, טבריה")
   - Template body: `📍 איפה: {{4}}` ⚠️ **DO NOT use {{3}} in body!**

   The system automatically handles this based on whether media header is enabled.

2. **Link Variables:**
   - **{{7}} = Dynamic Link** - Context-dependent:
     - **Regular INVITE/REMINDER:** RSVP confirmation link
     - **Interactive templates:** Navigation link (guests confirm via buttons, not link)
     - **CONFIRMATION:** Navigation link
   - **{{9}} = Transportation Link** - Used ONLY in Style 3 templates (adds transportation option)
   - Style 3 templates include **BOTH** links ({{7}} for navigation, {{9}} for transportation)
   - Style 1 & 2 templates use only {{7}} (RSVP)

3. **Variable Usage by Template Style:**
   - **Minimal templates (Style 1):** Use {{1}}, {{2}}, {{7}}
   - **Detailed templates (Style 2):** Use {{1}}-{{7}}
   - **Detailed with Transportation (Style 3):** Use {{1}}-{{7}} + {{9}}
   - **Event Day / Table Assignment:** Also use {{8}} for table number
   - **Interactive with Media:** {{3}} in header only, {{4}} for venue in body

4. **Media Header Configuration:**
   - Media URL is constructed in the **header section** (not body)
   - Format: `https://res.cloudinary.com/{{3}}`
   - Variable value: `invitations/wedding_invite.jpg`
   - Final header URL: `https://res.cloudinary.com/invitations/wedding_invite.jpg`
   - Body text references venue using {{4}} (automatically combined)

**IMPORTANT - Template Body with Media:**
   - ⚠️ When media header is enabled, **DO NOT use {{3}} in template body**
   - {{3}} is reserved for media URL in the header
   - Use {{4}} for venue location (automatically combines venue name + address)
   - Example WITHOUT media: `📍 איפה: {{3}}, {{4}}`
   - Example WITH media: `📍 איפה: {{4}}` ({{3}} is in header, not body)

---

## Testing Templates

Before going live:

1. **Test with Real Phone Numbers**
   - Send test messages to yourself
   - Verify all variables render correctly
   - Check link shortening works

2. **Check Different Devices**
   - iOS WhatsApp
   - Android WhatsApp
   - WhatsApp Web

3. **Verify Button Interactions**
   - Interactive buttons work
   - List picker selections register
   - Responses are tracked

4. **Hebrew RTL Display**
   - Ensure proper right-to-left rendering
   - Check punctuation displays correctly
   - Verify emojis don't break layout

---

## Common Issues & Solutions

### Template Rejected - "Variables at Start/End"

**Problem**: Template starts or ends with a variable like `{{1}}`.

**Solution**: Add text before/after:
```
Bad:  {{1}}, מוזמן לאירוע...
Good: שלום {{1}}, מוזמן לאירוع...
```

### Template Rejected - "Invalid Format"

**Problem**: Template contains unsupported characters or formatting.

**Solution**:
- Remove special formatting
- Use only plain text and approved emojis
- Avoid markdown or HTML

### Template Rejected - "Category Mismatch"

**Problem**: Content doesn't match selected category.

**Solution**:
- Use MARKETING for invites/reminders
- Ensure content is promotional, not transactional

### Button Text Too Long

**Problem**: Button exceeds 20 character limit.

**Solution**: Shorten text:
```
Bad:  מאשר הגעה לאירוע (21 chars)
Good: מאשר הגעה (11 chars)
```

---

## Maintenance & Updates

### When to Update Templates

1. **Seasonal Events**: Create variants for holidays
2. **User Feedback**: Adjust tone based on responses
3. **WhatsApp Policy Changes**: Update to comply with new rules
4. **A/B Testing Results**: Optimize based on engagement

### Version Control

Keep track of template versions:
- `wedinex_invite_style1_v2`
- `wedinex_reminder_style2_v3`

### Archiving Old Templates

When updating templates:
1. Don't delete old versions immediately
2. Mark as inactive in Wedinex
3. Monitor for 30 days before final deletion

---

## Best Practices

### Tone & Language

✅ **Do**:
- Use warm, friendly, conversational Hebrew
- Keep it personal with {{1}} variable
- Be concise and clear
- Use emojis strategically (1-3 per template):
  - 👋 🎉 💙 for greetings and warmth
  - 📍 📅 🕐 for information markers
  - 🚌 🪑 for specific features
  - ✅ ❌ 🤔 for interactive buttons
- Sound human, not robotic

❌ **Don't**:
- Use formal/stiff language ("אנו מבקשים", "בכבוד רב")
- Overuse emojis (more than 4-5 per message)
- Make templates too long (keep under 500 chars when possible)
- Use slang or too informal shortcuts
- Sound like a corporate announcement

### Content Structure

✅ **Do**:
- Start with greeting
- State purpose clearly
- Provide clear call-to-action
- End with warm closing

❌ **Don't**:
- Bury the main message
- Use multiple CTAs
- Include irrelevant information
- Forget to personalize

### Technical Considerations

✅ **Do**:
- Test all variables with real data
- Verify links work and are properly shortened
- Check mobile rendering on iOS and Android
- Monitor delivery rates
- Use the 9-variable system for maximum flexibility:
  - {{1}}-{{2}} for basic personalization
  - {{3}}-{{6}} for detailed event info
  - {{7}} for RSVP links (all templates)
  - {{8}} for table assignments
  - {{9}} for transportation links (Style 3 only)
- Only include variables you actually need

❌ **Don't**:
- Use broken or expired links
- Exceed character limits (1024 for body)
- Skip the WhatsApp approval process
- Ignore Meta's template guidelines
- Include all 9 variables if not needed
- Use variables at the very start or end of text

---

## Quick Reference: All Templates Count

| Template Type | Number of Styles | Total Templates |
|--------------|------------------|-----------------|
| INVITE | 3 | 3 |
| REMINDER | 3 | 3 |
| INTERACTIVE_INVITE | 3 | 3 |
| INTERACTIVE_REMINDER | 3 | 3 |
| IMAGE_INVITE | 1 | 1 |
| CONFIRMATION | 1 | 1 |
| EVENT_DAY | 1 | 1 |
| THANK_YOU | 1 | 1 |
| TABLE_ASSIGNMENT | 1 | 1 |
| GUEST_COUNT_LIST | 1 | 1 |
| **TOTAL** | — | **18 Templates** |

---

## Support & Resources

- **Twilio Content API Docs**: https://www.twilio.com/docs/content
- **WhatsApp Template Guidelines**: https://developers.facebook.com/docs/whatsapp/message-templates/guidelines
- **Wedinex Admin Panel**: `/he/admin/messaging`

---

## Changelog

### Version 2.1 - February 2026
- ✨ **Upgraded to 9-Variable System** - Added separate transportation link ({{9}})
- ✨ Variable {{7}} is now ALWAYS RSVP Link (all templates)
- ✨ Variable {{9}} is Transportation Link (Style 3 only)
- ✨ Style 3 templates now support BOTH RSVP and Transportation links
- 📝 Updated messaging integration to detect Style 3 and include transportation link
- 📝 Updated send message dialog preview to support 9 variables
- 📝 Enhanced notification service with automatic Style 3 detection

### Version 2.0 - February 2026
- ✨ Added automated V3 Template Creation Dialog
- ✨ Added Media Header support for interactive templates
- ✨ Auto-generation of template names and content
- ✨ Live validation and preview features
- ✨ Automatic Twilio submission and approval tracking
- 📝 Updated variable mapping for media URL support
- 📝 Reorganized creation methods (automated vs manual)
- 📝 Enhanced documentation for all template types

### Version 1.0 - January 2026
- Initial release
- 18 template types with 3 styles each
- 8-variable system (upgraded to 9 in v2.1)
- Hebrew templates
- Manual Twilio creation process

---

**Last Updated**: February 4, 2026
**Version**: 2.1
**Created by**: Wedinex Development Team
