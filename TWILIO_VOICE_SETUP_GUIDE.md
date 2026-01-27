# Twilio Voice Call Center - Setup Guide

Complete guide to setting up the browser-based call center feature with voice changing capabilities.

---

## Overview

The Call Center feature allows event owners to make outbound calls to guests directly from their browser with:
- **Browser-based calling** using microphone (no phone required)
- **Voice changing** with 5 presets (normal, deep, high, robot, elderly)
- **Real-time call controls** (mute, end call)
- **Call notes** and **RSVP updates** during calls
- **Call history** tracking

---

## Prerequisites

1. **Twilio Account**: You need a Twilio account (free trial works)
2. **Twilio Phone Number**: One phone number for Caller ID
3. **TWILIO_ACCOUNT_SID**: Already configured in your `.env`
4. **TWILIO_AUTH_TOKEN**: Already configured in your `.env`

---

## Step 1: Create Twilio API Key

API Keys are needed for token generation (more secure than using Account SID/Token directly).

### Instructions:

1. Go to [Twilio Console → Account → API Keys](https://www.twilio.com/console/project/api-keys)
2. Click **Create API Key**
3. Give it a name: `Wedinex Call Center`
4. Select **Key Type**: Standard
5. Click **Create API Key**
6. **IMPORTANT**: Copy the **SID** (starts with `SK...`) and **Secret** immediately - you won't see the secret again!

### Save These Values:
- **API Key SID**: `SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **API Secret**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Step 2: Create TwiML Application

TwiML Apps define how Twilio handles calls made from the browser.

### Instructions:

1. Go to [Twilio Console → Voice → TwiML Apps](https://www.twilio.com/console/voice/twiml/apps)
2. Click **Create new TwiML App**
3. Fill in the form:
   - **Friendly Name**: `Wedinex Call Center`
   - **Voice Request URL**: `https://your-domain.com/api/twilio-voice/twiml`
     - Method: **HTTP POST**
   - **Voice Status Callback URL**: `https://your-domain.com/api/twilio-voice/status`
     - Method: **HTTP POST**

4. Click **Save**
5. Copy the **TwiML App SID** (starts with `AP...`)

### Save This Value:
- **TwiML App SID**: `APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Note**: Replace `your-domain.com` with your actual domain (e.g., `wedinex.vercel.app`)

---

## Step 3: Get Your Twilio Phone Number

You need a phone number for Caller ID when calling guests.

### Instructions:

1. Go to [Twilio Console → Phone Numbers → Manage → Active Numbers](https://www.twilio.com/console/phone-numbers/incoming)
2. Find your phone number (or buy a new one if you don't have one)
3. Copy the phone number in **E.164 format** (e.g., `+12345678900`)

### Save This Value:
- **Twilio Phone Number**: `+12345678900`

---

## Step 4: Configure in Admin Panel

Now enter all the settings in the Wedinex admin panel.

### Instructions:

1. Log in as **Platform Owner** (ROLE_PLATFORM_OWNER)
2. Go to **Admin Panel → Call Center (Twilio Voice)**
3. Fill in the form with values from Steps 1-3:

| Field | Value | From Step |
|-------|-------|-----------|
| **Twilio API Key (SID)** | `SKxxxxx...` | Step 1 |
| **Twilio API Secret** | `xxxxxxx...` | Step 1 |
| **TwiML App SID** | `APxxxxx...` | Step 2 |
| **Twilio Phone Number** | `+1234567890` | Step 3 |
| **Enable Twilio Voice** | Toggle ON | - |

4. Click **Save Configuration**
5. Click **Test Connection** to verify setup

---

## Step 5: Test the Call Center

Now test making a call!

### Instructions:

1. Go to any event: **Events → [Select Event] → Call Center**
2. The page will initialize the Twilio Device (you'll see a success toast)
3. Grant **microphone permissions** when prompted by your browser
4. Click on a guest with a phone number to call them
5. **Call Controls**:
   - **Mute**: Toggle microphone on/off
   - **End Call**: Hang up
   - **Voice Effects**: Change your voice in real-time
   - **Call Notes**: Add notes during/after the call
   - **Update RSVP**: Update guest status from the call

---

## Features Overview

### Voice Changer (5 Presets)

| Preset | Description |
|--------|-------------|
| **Normal** | Your natural voice (no effects) |
| **Deep** | Lower pitch, slight reverb (deeper voice) |
| **High** | Higher pitch (lighter voice) |
| **Robot** | Robotic effect with tremolo |
| **Elderly** | Slight pitch down with warmth |

### Call Status Flow

1. **Initiating** → Creating call log
2. **Ringing** → Phone is ringing
3. **Connected** → Call answered, timer starts
4. **Completed/Failed/No Answer** → Call ended

### Call History

- View all past calls in the **Call History** drawer
- Shows: Guest name, phone, status, duration, timestamp
- Accessible via the floating button (bottom-right)

---

## Important Notes

### Browser Compatibility
- **Chrome/Edge**: Full support ✅
- **Firefox**: Full support ✅
- **Safari**: Full support ✅
- **Mobile**: May work but not optimal

### Microphone Requirements
- **Headset recommended** to avoid echo
- Grant microphone permissions when prompted
- Check browser settings if permissions are denied

### Call Quality
- Good internet connection required (at least 1 Mbps upload)
- Use wired connection for best quality
- Voice effects process locally (no latency)

### Costs
- **Twilio Voice**: ~$0.0085/min for outbound calls to Israel
- **No transcription costs** (manual notes only)
- **Voice changing**: Free (Web Audio API, browser-based)

### Security
- Tokens expire after 1 hour (auto-refresh on page reload)
- Only event owners and editor collaborators can access
- All calls logged for audit trail
- API keys stored securely in database

---

## Troubleshooting

### "Failed to initialize call center"

**Cause**: Token generation failed (settings not configured)

**Fix**:
1. Go to Admin Panel → Call Center
2. Verify all fields are filled
3. Click "Test Connection"
4. Ensure TwiML App URLs are correct

### "Device error: 31205"

**Cause**: Invalid or expired token

**Fix**:
1. Reload the page to get a new token
2. Check that Twilio Voice is **Enabled** in admin panel
3. Verify API Key/Secret are correct

### "Call error: Connection declined"

**Cause**: TwiML App not configured correctly

**Fix**:
1. Go to Twilio Console → TwiML Apps
2. Verify **Voice Request URL** is correct
3. URL must be: `https://your-domain.com/api/twilio-voice/twiml`
4. Method must be **POST**

### No audio / microphone not working

**Fix**:
1. Check browser permissions (Settings → Privacy → Microphone)
2. Grant microphone access when prompted
3. Try a different browser
4. Use headset to avoid echo

### Voice changer not working

**Fix**:
1. Only works when call is **Connected** (not during ringing)
2. Try different presets
3. Voice effects are subtle (not extreme transformations)
4. Some presets work better with certain voice types

---

## Development Notes

### Architecture

```
Frontend (Browser)
  ↓
  Twilio Device SDK (@twilio/voice-sdk)
  ↓
  Voice Processor (Web Audio API)
  ↓
  Twilio Voice API
  ↓
  Guest's Phone
```

### Key Files

- **Admin Panel**: `/admin/twilio-voice`
- **Call Center Page**: `/events/[eventId]/call-center`
- **Token Generator**: `lib/twilio-voice/token-generator.ts`
- **Voice Processor**: `lib/twilio-voice/voice-processor.ts`
- **Server Actions**: `actions/call-center.ts`
- **API Routes**: `/api/twilio-voice/*`

### Database

- **ManualCallLog**: Tracks all calls
- **ManualCallStatus**: INITIATED, RINGING, CONNECTED, COMPLETED, etc.
- **MessagingProviderSettings**: Stores Twilio Voice credentials

---

## Next Steps

1. ✅ Complete all setup steps above
2. ✅ Test with a real phone number
3. ✅ Train event owners on how to use it
4. Consider adding:
   - Call recording (requires Twilio add-on)
   - Conference calls (multiple guests at once)
   - IVR menus for automated responses
   - Click-to-call from guest list (one-click calling)

---

## Support

If you encounter issues:

1. Check Twilio Console → Monitor → Logs for errors
2. Check browser console for JavaScript errors
3. Verify all webhook URLs are accessible (test with curl)
4. Review call logs in database: `ManualCallLog` table

---

**Congratulations! Your call center is now ready to use! 🎉📞**
