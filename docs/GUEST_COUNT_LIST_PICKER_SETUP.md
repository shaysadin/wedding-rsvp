# Guest Count List-Picker Setup Guide

## Overview

This guide explains how to set up the **custom list-picker** for guest count selection to **save costs** while maintaining the interactive list picker UI.

## The Problem

Previously, the guest count list was sent using a **WhatsApp-approved marketing template**. This was expensive because:
- Marketing templates have higher costs
- The template wasn't necessary since the message is sent **within the 24-hour customer service window** (after the guest has already replied to the RSVP invitation)

## The Solution

Use a **custom Twilio Content API resource** with type `twilio/list-picker` instead of a WhatsApp-approved template.

### Benefits:
✅ **Interactive list picker UI** (better UX than plain text)
✅ **Free-form content** (no WhatsApp template approval needed)
✅ **Lower cost** than marketing templates
✅ **Perfect for RSVP flow** where guest already initiated conversation

### How It Works:

1. **Guest replies to RSVP invitation** → Opens 24-hour customer service window
2. **System sends list-picker** → Uses custom content (NOT a marketing template)
3. **Guest selects from 1-10 options** → Interactive list UI in WhatsApp
4. **No template approval needed** → Lower cost, same great UX

## Setup Instructions

### Step 1: Create the Custom List-Picker Content

Run the helper script to create the content resource in Twilio:

```bash
# Set your Twilio credentials
export TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
export TWILIO_AUTH_TOKEN=your_auth_token_here

# Run the script
node scripts/create-guest-count-list-picker.js
```

**Windows PowerShell:**
```powershell
$env:TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxx"
$env:TWILIO_AUTH_TOKEN="your_auth_token_here"
node scripts/create-guest-count-list-picker.js
```

**Windows CMD:**
```cmd
set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
set TWILIO_AUTH_TOKEN=your_auth_token_here
node scripts/create-guest-count-list-picker.js
```

### Step 2: Copy the ContentSid

The script will output something like:

```
✅ Success! Custom list-picker content created.

📋 Content Details:
   Friendly Name: wedinex_guest_count_list_picker
   Language: he
   Type: twilio/list-picker (free-form interactive content)

🔑 ContentSid: HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Copy the ContentSid** (starts with `HX`).

### Step 3: Update Your Database

Update your database to use the new ContentSid:

```sql
UPDATE messaging_provider_settings
SET whatsapp_guest_count_list_content_sid = 'HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
```

**OR** update via Prisma Studio:

```bash
npx prisma studio
```

1. Navigate to `MessagingProviderSettings`
2. Find your record
3. Update `whatsappGuestCountListContentSid` field
4. Save

### Step 4: Test It!

1. Send an RSVP invitation to a test guest
2. Have the test guest reply to accept the invitation
3. The system will automatically send the guest count list-picker
4. Verify it appears as an **interactive list** (not plain text)

## What Gets Created

The script creates a custom Content resource with:

### Hebrew List-Picker (Primary):
```
שלום {{1}}! 👥

כמה אורחים יגיעו ל{{2}}?

[Interactive List Button: "בחר מספר אורחים"]
```

**List Options:**
1. אורח 1 - אורח אחד בלבד
2. 2 אורחים - שני אורחים
3. 3 אורחים - שלושה אורחים
4. 4 אורחים - ארבעה אורחים
5. 5 אורחים - חמישה אורחים
6. 6 אורחים - שישה אורחים
7. 7 אורחים - שבעה אורחים
8. 8 אורחים - שמונה אורחים
9. 9 אורחים - תשעה אורחים
10. 10 אורחים - עשרה אורחים או יותר

### Plain Text Fallback:
For clients that don't support list-pickers, a plain text version is also included.

## Variables

The content uses two variables:

- `{{1}}` - Guest name
- `{{2}}` - Event title

These are automatically populated when the message is sent.

## Important Notes

### ⚠️ 24-Hour Window Requirement

This content can **ONLY** be sent within the 24-hour customer service window. This means:
- ✅ **Can send:** After guest replies to RSVP invitation
- ❌ **Cannot send:** As a business-initiated message to start a conversation

This is **perfect** for our use case since the guest count list is always sent after the guest has already replied to the RSVP.

### Cost Structure

| Message Type | Template Type | Cost | When Used |
|-------------|---------------|------|-----------|
| **Old Method** | WhatsApp-approved marketing template | Higher | Anytime |
| **New Method** | Custom list-picker content | Lower/Free | Within 24h window |

The new method is cheaper because:
1. It's **free-form content** (not a marketing template)
2. It's sent **within the 24-hour window** (session-based messaging)
3. No WhatsApp template approval needed

### Twilio Content API

The content is created via Twilio's Content API:
- **API Endpoint:** `https://content.twilio.com/v1/Content`
- **Content Type:** `twilio/list-picker`
- **Friendly Name:** `wedinex_guest_count_list_picker`
- **Language:** Hebrew (`he`)

## Troubleshooting

### Error: "Guest count list-picker ContentSid not configured"

**Cause:** The `whatsappGuestCountListContentSid` field is empty in your database.

**Solution:** Follow Steps 1-3 above to create and configure the ContentSid.

### The message appears as plain text instead of a list

**Possible Causes:**

1. **Wrong ContentSid:** Make sure you're using the custom list-picker ContentSid (starts with `HX`), not a template ContentSid.

2. **Client doesn't support lists:** Some older WhatsApp clients may not support interactive lists and will show the plain text fallback.

3. **Using wrong content type:** Verify the content was created with type `twilio/list-picker`.

### List responses not being processed

**Check:** The `handleListResponse` function in `app/api/twilio/whatsapp/route.ts` processes list selections.

**Verify:** The response webhook is properly configured in Twilio Console.

### Error creating content (script fails)

**Common Issues:**

1. **Invalid credentials:** Double-check your `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`

2. **Network error:** Make sure you can reach `content.twilio.com`

3. **Account permissions:** Ensure your Twilio account has access to the Content API

## Manual Creation (Alternative)

If you prefer to create the content manually via Twilio Console:

1. Go to [Twilio Console > Content](https://console.twilio.com/us1/develop/sms/content-editor)
2. Click **Create new Content**
3. Choose **List Picker** content type
4. Configure:
   - **Friendly Name:** `wedinex_guest_count_list_picker`
   - **Language:** Hebrew
   - **Body:** `שלום {{1}}! 👥\n\nכמה אורחים יגיעו ל{{2}}?`
   - **Button Text:** `בחר מספר אורחים`
   - **List Items:** Add 10 items as shown in the script
5. Click **Create**
6. Copy the ContentSid and update your database

## Verification

To verify the setup is working:

```sql
-- Check the ContentSid is configured
SELECT whatsapp_guest_count_list_content_sid
FROM messaging_provider_settings;

-- Should return: HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Cost Comparison Example

Assuming Twilio's pricing (prices vary by region):

| Scenario | Old Method | New Method | Savings |
|----------|-----------|------------|---------|
| 100 guest count requests | ~$2.60 (template) | ~$0.50 (free-form) | ~$2.10 (81%) |
| 500 guest count requests | ~$13.00 (template) | ~$2.50 (free-form) | ~$10.50 (81%) |
| 1000 guest count requests | ~$26.00 (template) | ~$5.00 (free-form) | ~$21.00 (81%) |

*Prices are estimates and vary by region. Check Twilio's pricing for your specific location.*

## Technical Details

### Code Changes

**File:** `app/api/twilio/whatsapp/route.ts`

**Function:** `sendGuestCountList()`

**Before:**
```javascript
// Used WhatsApp-approved marketing template
await client.messages.create({
  contentSid: settings.whatsappGuestCountListContentSid, // Marketing template
  contentVariables: JSON.stringify({ "1": name, "2": title }),
  // ...
});
```

**After:**
```javascript
// Uses custom list-picker content (same API, different ContentSid)
await client.messages.create({
  contentSid: settings.whatsappGuestCountListContentSid, // Custom content
  contentVariables: JSON.stringify({ "1": name, "2": title }),
  // ...
});
```

The API call is **identical** - only the ContentSid changes. The new ContentSid points to custom content instead of a WhatsApp-approved template.

## Resources

- [Twilio Content API Documentation](https://www.twilio.com/docs/content)
- [Twilio List-Picker Content Type](https://www.twilio.com/docs/content/twiliolist-picker)
- [WhatsApp Business API - 24-Hour Window](https://www.twilio.com/docs/whatsapp/api#customer-service-window)

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review Twilio logs in the Console
3. Verify the ContentSid matches what's in your database
4. Ensure you're testing within the 24-hour window

---

**Last Updated:** February 2, 2026
**Version:** 1.0
