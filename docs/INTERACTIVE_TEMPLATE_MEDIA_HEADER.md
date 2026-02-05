# Interactive Template Media Header

## Overview

Interactive WhatsApp templates (Quick Reply with buttons) now support an optional **Media Header** feature. This allows you to include an image, video, or document at the top of your interactive messages.

## Feature Details

### When Available
The Media Header option appears in **Step 1** when:
- Content Type is `twilio/quick-reply`
- OR Template Type is `INTERACTIVE_INVITE`
- OR Template Type is `INTERACTIVE_REMINDER`

### Configuration

1. **Enable Media Header**
   - Toggle the checkbox to enable/disable
   - Default: OFF (disabled)

2. **Select Media Type** (when enabled)
   - Image
   - Video
   - Document

3. **Media URL Format**
   ```
   https://res.cloudinary.com/{{3}}
   ```

   The variable `{{3}}` will contain the Cloudinary path to your media file.

### Variable Mapping

When media header is **ENABLED**:
- `{{1}}` = Guest Name (שם האורח/ת)
- `{{2}}` = Event Name (שם האירוע)
- `{{3}}` = **Media URL Path** (e.g., `invitations/wedding_invite.jpg`)
- `{{4}}` = Full Address (כתובת מלאה)
- `{{5}}` = Date (תאריך)
- `{{6}}` = Time (שעה)
- `{{7}}` = Dynamic Link (קישור דינמי)
- `{{8}}` = Table Number (מספר שולחן)

When media header is **DISABLED**:
- `{{3}}` = Venue Name (שם המקום) - as usual

## Example Usage

### Interactive Invite with Image Header

**Step 1 Configuration:**
- Create template for: הזמנה אינטראקטיבית - סגנון 1
- Content Type: Quick Reply
- Category: UTILITY
- Media Header: ✅ Enabled
- Media Type: Image

**Step 2 Content:**
```
היי {{1}} 👋

מוזמנים לחגוג איתנו את {{2}}!

📍 {{4}}
📅 {{5}} בשעה {{6}}

לאישור הגעה:
{{7}}
```

**Result:**
The message will include:
1. **Header**: Image from `https://res.cloudinary.com/{{3}}`
2. **Body**: The message text with variables
3. **Buttons**: Interactive response buttons (כן, לא, אולי)

## Important Notes

⚠️ **Before Sending:**
- Ensure the media file exists in your Cloudinary account
- The `{{3}}` variable value should be just the path: `invitations/wedding_invite.jpg`
- The full URL will be constructed automatically: `https://res.cloudinary.com/invitations/wedding_invite.jpg`

## Technical Implementation

**File:** `components/admin/templates/template-creation-dialog-v3.tsx`

**Key States:**
- `includeMedia` - Boolean toggle for media header
- `mediaType` - Type of media (IMAGE | VIDEO | DOCUMENT)

**Database Field:**
- `mediaType` column in `WhatsAppTemplate` table stores the selected type
- Only populated when `includeMedia` is true

## UI Features

**Visual Indicators:**
- Purple card background for media header section
- Clear toggle with enabled/disabled state
- Explanatory text about URL format
- Warning about verifying Cloudinary availability
- Conditional rendering - only shows when relevant

## Benefits

1. **Visual Appeal**: Add eye-catching images to invitations
2. **Brand Consistency**: Include your event logo or theme
3. **Information Density**: Show venue photo or event graphics
4. **Interactive + Visual**: Combine rich media with quick-reply buttons
5. **Flexibility**: Optional - can be enabled/disabled per template
