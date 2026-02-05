# Template Creation Dialog V3 - Step Structure

## ✅ Updated Step Organization

The template creation has been reorganized into a logical 2-step flow:

---

## 📋 Step 1: Content Type & Basic Info

**Focus:** Twilio/WhatsApp configuration and naming

### Fields in Step 1:

1. **Content Type (סוג תוכן)** * - REQUIRED
   - `twilio/text` - Plain text
   - `twilio/quick-reply` - Interactive buttons
   - `twilio/media` - Media (image/video)
   - `twilio/list-picker` - List selection
   - `twilio/card` - Card format

2. **Category (קטגוריה)** * - REQUIRED
   - `UTILITY` - General business updates (recommended)
   - `MARKETING` - Promotional content
   - `AUTHENTICATION` - OTP codes

3. **Language (שפה)** * - REQUIRED
   - Hebrew (עברית)
   - English
   - en_US
   - he_IL

4. **Template Name (שם התבנית)** * - REQUIRED
   - Display name in Hebrew
   - Shows in admin UI and template selector

5. **Twilio Template Name** * - REQUIRED
   - Technical name for Twilio API
   - English, lowercase, underscores
   - Auto-generate button available
   - Example: `wedinex_invite_1_he`

6. **Media Settings** (conditional - only for `twilio/media`)
   - Media Type: IMAGE, VIDEO, or DOCUMENT
   - Media URL format: `https://res.cloudinary.com/{{3}}`
   - Variable `{{3}}` contains the media path

### Validation:
- All required fields must be filled
- Template name must not be empty
- Twilio name must follow format rules
- If media type selected, media type is required

### UI Highlights:
- Blue card for Twilio/WhatsApp settings
- Amber card for media configuration (when applicable)
- Auto-generate button for Twilio name
- Info card showing next step preview

---

## ✍️ Step 2: Template Content

**Focus:** Message content, variables, and buttons

### Fields in Step 2:

1. **Template Type (סוג תבנית)** *
   - INVITE, REMINDER, INTERACTIVE_INVITE, etc.
   - 10 different types available

2. **Style (סגנון)** *
   - Style 1 - מינימלי (minimal)
   - Style 2 - מפורט (detailed)
   - Style 3 - עם הסעות (with transportation)

3. **Auto-Generate Button**
   - "צור הודעה מקצועית" (Create professional message)
   - Generates content based on type and style
   - Uses 8-variable system
   - Friendly Hebrew tone

4. **Variable Helper**
   - Shows recommended variables for selected type/style
   - Lists all 8 available variables
   - WhatsApp guidelines

5. **Template Body (תוכן ההודעה)** *
   - Main message content
   - Max 1024 characters
   - Uses variables {{1}} through {{8}}
   - Cannot start or end with variable
   - Multi-line textarea with character count

6. **Header Text (כותרת עליונה)** - OPTIONAL
   - Optional header above message
   - Example: "ברוכים הבאים!"

7. **Footer Text (כותרת תחתונה)** - OPTIONAL
   - Optional footer below message
   - Example: "תודה, צוות Wedinex"

8. **Preview Text** - OPTIONAL
   - Shows in admin template selector
   - Helps identify template purpose

9. **Interactive Buttons** (conditional - only for quick-reply)
   - Max 3 buttons
   - Max 20 characters per button
   - Button configuration editor
   - Purple card highlighting

10. **Live Validation & Preview**
    - Real-time validation with visual feedback
    - Character count progress bar
    - Variable usage checker
    - Button validation
    - Live preview with sample data

### Validation:
- Template body required
- Max 1024 characters
- Cannot start/end with variable
- All button text required (if buttons exist)
- Max 20 chars per button
- Max 3 buttons total

### UI Highlights:
- Variable helper at top
- Auto-generate button prominent
- Purple card for interactive buttons
- Comprehensive validation component
- Live preview at bottom

---

## 🎯 User Flow

### Happy Path:

1. **User opens dialog**
2. **Step 1:**
   - Selects Content Type (quick-reply for buttons)
   - Chooses Category (UTILITY)
   - Picks Language (Hebrew)
   - Enters Template Name ("הזמנה רשמית סגנון 1")
   - Clicks "צור שם אוטומטי" for Twilio name
   - Clicks "הבא" (Next)

3. **Step 2:**
   - Selects Template Type (INVITE)
   - Chooses Style (Style 2 - detailed)
   - Clicks "צור הודעה מקצועית"
   - Reviews auto-generated content
   - Tweaks as needed
   - Configures buttons (if quick-reply)
   - Reviews validation feedback
   - Checks live preview
   - Clicks "צור ושלח לאישור" (Create and Submit)

4. **Submission:**
   - Template created in database
   - Auto-submitted to WhatsApp
   - Status shows "PENDING"
   - Success toast notification
   - Dialog closes
   - User redirected to template list

---

## 🔧 Technical Details

### State Management:

**Step 1 State:**
- contentType
- category
- language
- nameHe
- twilioTemplateName
- mediaType (conditional)

**Step 2 State:**
- type
- style
- templateBodyHe
- headerText
- footerText
- previewTextHe
- buttons (conditional)

### Validation Functions:

```typescript
validateStep1(): boolean
  - Checks: contentType, category, language, nameHe, twilioTemplateName
  - Special check for media type if contentType is media

validateStep2(): boolean
  - Checks: templateBodyHe length and content
  - Validates no variables at start/end
  - Validates buttons if interactive
```

### Auto-Generation:

```typescript
generateTwilioName(): string
  - Format: wedinex_{type}_{style}_{language}
  - Example: wedinex_invite_1_he

generateTemplateMessage(type, style): {body, preview}
  - Returns pre-written professional message
  - Uses 8-variable system
  - Friendly Hebrew tone with emojis
```

---

## 📝 Comparison: Old vs New

| Aspect | Old (V2) | New (V3) |
|--------|----------|----------|
| **Steps** | 1 step | 2 logical steps |
| **Step 1** | Type, style, all content | Content type, category, language, name |
| **Step 2** | N/A | Template type, style, content, buttons |
| **Content Type** | Not configurable | Full Twilio options |
| **Category** | Not set | UTILITY, MARKETING, AUTHENTICATION |
| **Language** | Hardcoded | Configurable |
| **Media Support** | No | Yes, with {{3}} variable |
| **Validation** | Basic | Comprehensive with visual feedback |
| **Auto-Generate** | Name + content | Content only (name set in Step 1) |

---

## ✅ Benefits of New Structure

1. **Logical Flow**: Configuration → Content
2. **Clear Separation**: Twilio settings vs. message creation
3. **Better UX**: Users understand what to fill when
4. **Validation at Right Time**: Step-specific validation
5. **Full Twilio Support**: All Content API fields available
6. **Media Templates**: Proper support for image/video messages
7. **Professional**: Matches industry-standard multi-step forms

---

## 🚀 Next Steps for User

1. **Run database migration:**
   ```bash
   npm run db:push
   ```

2. **Update admin panel import:**
   ```tsx
   import { TemplateCreationDialogV3 } from "./templates/template-creation-dialog-v3";
   ```

3. **Test the new flow:**
   - Create a text template
   - Create a quick-reply template with buttons
   - Create a media template with image
   - Verify all fields save correctly

4. **Check submission:**
   - Verify template marked as PENDING
   - Check database for all new fields populated
   - Confirm auto-generate works properly

---

## 📚 Related Documentation

- Main guide: `WHATSAPP_TEMPLATE_V3_ENHANCEMENTS.md`
- Variable system: `WHATSAPP_TEMPLATE_CREATION_GUIDE.md`
- 8-variable details: `WHATSAPP_TEMPLATES_GUIDE.md`
