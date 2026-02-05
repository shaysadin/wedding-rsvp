# Scripts Directory

Utility scripts for Wedinex wedding management platform.

## Available Scripts

### test-password-reset.js

Tests the password reset email functionality and SMTP configuration.

**Purpose:** Diagnose and troubleshoot password reset email issues by testing SMTP connection and sending a test email.

**Usage:**

```bash
node scripts/test-password-reset.js <email-address>
```

**Example:**

```bash
node scripts/test-password-reset.js admin@example.com
```

**What it does:**
1. Checks if all required SMTP environment variables are set
2. Validates SMTP configuration (host, port, user, password)
3. Tests SMTP connection with your credentials
4. Sends a test password reset email with a sample reset link
5. Provides troubleshooting tips if any issues are found

**Required Environment Variables:**
- `SMTP_HOST` - Your SMTP server hostname
- `SMTP_PORT` - SMTP port (default: 587)
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password
- `EMAIL_FROM` - Sender email address (optional, defaults to SMTP_USER)
- `NEXT_PUBLIC_APP_URL` - Your application URL

**Troubleshooting:**
- If connection fails, check firewall settings
- For Gmail, enable "App Passwords" in Google Account settings
- Some providers require SSL (port 465) instead of TLS (port 587)
- Check spam folder if emails aren't arriving

---

### create-guest-count-list-picker.js

Creates a custom Twilio Content API resource for the guest count selection feature.

**Purpose:** Replace expensive WhatsApp marketing templates with free-form custom content to save costs while maintaining the interactive list picker UI.

**Usage:**

```bash
# Set Twilio credentials
export TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
export TWILIO_AUTH_TOKEN=your_auth_token_here

# Run the script
node scripts/create-guest-count-list-picker.js
```

**What it does:**
1. Creates a custom `twilio/list-picker` content resource
2. Configures 10 guest count options (1-10 guests) in Hebrew
3. Includes plain text fallback for non-supporting clients
4. Returns a ContentSid (HX...) to use in your database

**After running:**
1. Copy the ContentSid from the output
2. Update your database:
   ```sql
   UPDATE messaging_provider_settings
   SET whatsapp_guest_count_list_content_sid = 'HXxxxxxxxx';
   ```

**Documentation:** See [docs/GUEST_COUNT_LIST_PICKER_SETUP.md](../docs/GUEST_COUNT_LIST_PICKER_SETUP.md)

**Benefits:**
- ✅ Interactive list picker UI (better UX)
- ✅ Lower cost than marketing templates (~81% savings)
- ✅ No WhatsApp approval needed
- ✅ Works within 24-hour customer service window

---

### add-navigation-codes.js

Generates short navigation codes for existing events.

**Purpose:** Replace long event IDs in navigation URLs with short 6-character codes to make URLs more user-friendly and less suspicious-looking.

**Usage:**

```bash
node scripts/add-navigation-codes.js
```

**What it does:**
1. Finds all events without navigationCode values
2. Generates unique 6-character codes (lowercase letters and numbers, no confusing chars)
3. Updates each event with its short code
4. Falls back to 7-character codes if collisions occur

**Example Output:**
```
✅ חתונה של שי וספיר: svd4vv
✅ החתונה של תומר וסיווון: brekwe
```

**Benefits:**
- ✅ Short URLs: `/n/abc123` instead of `/n/cmivxaj5q0001g0y9xzw9zirl`
- ✅ More trustworthy appearance for guests
- ✅ Maintains backwards compatibility (long event IDs still work)

**Database Changes:**
- Adds `navigationCode` field to `wedding_events` table
- Field is unique and indexed for fast lookups

---

### shorten-transportation-slugs.js

Converts existing 12-character transportation slugs to 6-character codes.

**Purpose:** Make transportation URLs shorter and cleaner by using 6-character codes instead of 12-character slugs.

**Usage:**

```bash
node scripts/shorten-transportation-slugs.js
```

**What it does:**
1. Finds all guests with transportation slugs longer than 6 characters
2. Generates unique 6-character codes (URL-safe, no confusing chars)
3. Updates each guest with the shorter slug
4. Falls back to 7-character codes if collisions occur

**Example Output:**
```
✅ דני כהן: BxY9z3K8pQw2 → abc123
✅ שרה לוי: K3mN9pQr7sWx → def456
```

**Benefits:**
- ✅ Short URLs: `/transportation/abc123` instead of `/transportation/BxY9z3K8pQw2`
- ✅ Better user experience in WhatsApp messages
- ✅ Reduces message character count

**Note:** New guests will automatically receive 6-character transportation slugs. This script only updates existing guests.

---

### fix-collaborator-permissions.js

Adds `canAccessEvent` import to action files that need collaborator support.

**Purpose:** Automated helper to add the necessary import statement for collaborator permission checking.

**Usage:**

```bash
node scripts/fix-collaborator-permissions.js
```

**What it does:**
1. Scans specified action files for `canAccessEvent` import
2. Adds the import if not present
3. Reports which files were updated

**Files it checks:**
- `seating.ts`
- `tasks.ts`
- `suppliers.ts`
- `notifications.ts`
- `rsvp-settings.ts`
- `invitations.ts`
- `bulk-notifications.ts`
- `generate-invitation.ts`

**Note:** This script only adds imports. You must manually replace ownership checks with `canAccessEvent()` calls.

---

### auto-fix-collaborators.js

Attempts to automatically replace owner-only checks with collaborator-aware permission checks.

**Purpose:** Automated migration to replace `where: { id: eventId, ownerId: user.id }` patterns with `canAccessEvent(eventId, user.id, "EDITOR")`.

**Usage:**

```bash
node scripts/auto-fix-collaborators.js
```

**What it does:**
1. Uses regex to find ownership check patterns
2. Replaces with `canAccessEvent` helper calls
3. Distinguishes between write operations (require EDITOR) and read operations (any role)

**Warning:** Regex-based replacement can be error-prone. Always review changes before committing.

**Recommended approach:** Use this as a starting point, then manually review and refine each change.

---

### update-collaborator-access.ps1

PowerShell script for Windows users to scan and report ownership checks.

**Purpose:** Identify all action files that need manual updates for collaborator support.

**Usage:**

```powershell
.\scripts\update-collaborator-access.ps1
```

**What it does:**
1. Scans action files for `where: { id: ..., ownerId: user.id }` patterns
2. Reports count of ownership checks per file
3. Provides guidance on manual replacement

**Output:** Summary report of files needing updates

---

## Adding New Scripts

When adding new scripts to this directory:

1. Use Node.js for consistency
2. Add shebang: `#!/usr/bin/env node`
3. Include detailed comments explaining purpose
4. Handle errors gracefully with helpful messages
5. Document usage in this README
6. Use environment variables for credentials (never hardcode)
