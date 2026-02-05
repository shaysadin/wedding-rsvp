# WhatsApp Template Management System - Architecture

## Overview

Complete system for creating, submitting, and managing WhatsApp templates from the admin panel without leaving the application.

## System Components

### 1. Database Layer (✅ Completed)
- **WhatsAppTemplate model** with approval status tracking
- **WhatsAppTemplateApprovalStatus enum** (DRAFT, PENDING, APPROVED, REJECTED, PAUSED)
- Fields: templateBodyHe, templateBodyEn, variables, buttonsConfig, etc.

### 2. Twilio Content API Client (`lib/twilio-content/`)
- **HTTP client** for Twilio Content API
- **Content type handlers**: text, quick-reply (buttons), list-picker
- **Template submission** with proper formatting
- **Status checking** functionality
- **Error handling** and response parsing

### 3. Server Actions (`actions/whatsapp-templates.ts`)
- `createWhatsAppTemplateContent()` - Create new template
- `updateWhatsAppTemplateContent()` - Edit draft template
- `deleteWhatsAppTemplateContent()` - Remove template
- `submitTemplateToTwilio()` - Submit to Twilio for approval
- `checkTemplateApprovalStatus()` - Check approval status
- `syncTemplateStatus()` - Sync all pending templates

### 4. Validation (`lib/validations/whatsapp-templates.ts`)
- Template creation schema
- Variable validation
- Button configuration validation
- Character limits (WhatsApp restrictions)

### 5. Admin UI Components (`components/admin/templates/`)
- **TemplateCreationDialog** - Create new templates
- **TemplateEditorForm** - Edit template content
- **TemplatePreview** - Live preview of message
- **ButtonConfigEditor** - Configure interactive buttons
- **VariableManager** - Manage {{1}}, {{2}}, etc.
- **ApprovalStatusBadge** - Visual status indicator
- **TemplateSubmissionQueue** - Bulk submission UI

## User Flows

### Flow 1: Create New Template
1. Admin clicks "Create Template" button
2. Selects template type and style
3. Enters template body in Hebrew and English
4. Adds variables ({{1}}, {{2}}, etc.) via dropdown/shortcuts
5. Configures buttons (if interactive template)
6. Previews message
7. Saves as DRAFT
8. Optionally submits to Twilio immediately

### Flow 2: Submit for Approval
1. Admin views DRAFT templates
2. Clicks "Submit to Twilio" button
3. System creates Twilio Content resource via API
4. Template status → PENDING
5. System stores submission timestamp
6. Admin can check status later

### Flow 3: Check Approval Status
1. Admin views PENDING templates
2. Clicks "Refresh Status" (individual or bulk)
3. System queries Twilio Content API
4. Updates status to APPROVED or REJECTED
5. If APPROVED: stores ContentSid
6. If REJECTED: stores rejection reason

### Flow 4: Use Approved Template
1. Template with status APPROVED can be used
2. ContentSid is available for sending messages
3. Template appears in send message dropdown

## Data Flow

```
Admin Panel → Create Template → Database (DRAFT)
           ↓
    Submit to Twilio → Twilio Content API
           ↓
    Store ContentSid ← WhatsApp Approval
           ↓
    Database (APPROVED) → Available for Use
```

## Technical Specifications

### Twilio Content API

**Endpoint**: `https://content.twilio.com/v1/Content`

**Authentication**: Basic Auth (Account SID + Auth Token)

**Content Types**:
1. **twilio/text** - Plain text messages
2. **twilio/quick-reply** - Messages with up to 3 buttons
3. **twilio/list-picker** - Interactive list (1-10 items)
4. **twilio/media** - Messages with images

**Template Structure**:
```json
{
  "friendly_name": "wedinex_invite_style1",
  "language": "he",
  "variables": {
    "1": "Guest Name",
    "2": "Event Title",
    "3": "RSVP Link"
  },
  "types": {
    "twilio/text": {
      "body": "שלום {{1}}, מוזמן ל{{2}}. RSVP: {{3}}"
    }
  }
}
```

**Interactive Template (Quick Reply)**:
```json
{
  "friendly_name": "wedinex_interactive_invite_style1",
  "language": "he",
  "variables": {
    "1": "Guest Name",
    "2": "Event Title"
  },
  "types": {
    "twilio/quick-reply": {
      "body": "שלום {{1}}, מוזמן ל{{2}}. מגיע?",
      "actions": [
        {
          "title": "כן, מגיע",
          "id": "yes"
        },
        {
          "title": "לא מגיע",
          "id": "no"
        },
        {
          "title": "אולי",
          "id": "maybe"
        }
      ]
    }
  }
}
```

### WhatsApp Template Restrictions

1. **Character Limits**:
   - Body: 1,024 characters
   - Button text: 20 characters
   - Variables: 200 characters each

2. **Button Limits**:
   - Quick Reply: 1-3 buttons
   - Call to Action: 1-2 buttons

3. **Variable Rules**:
   - Must be numbered sequentially: {{1}}, {{2}}, {{3}}
   - Cannot skip numbers
   - Maximum ~10 variables per template

4. **Approval Time**:
   - Usually 15 minutes to 24 hours
   - Can be instant for some templates
   - May require review for certain content

## Implementation Phases

### Phase 1: Foundation (Current)
- ✅ Database schema
- ✅ Template style renaming
- ✅ Transportation link integration

### Phase 2: API Client (Next)
- Twilio Content API client
- HTTP wrapper with auth
- Content type formatters
- Error handling

### Phase 3: Server Actions
- CRUD operations
- Template submission
- Status checking
- Validation

### Phase 4: UI Components
- Creation dialog
- Editor form
- Preview pane
- Status dashboard

### Phase 5: Testing & Polish
- End-to-end testing
- Error handling
- User feedback
- Documentation

## Security Considerations

1. **Role-Based Access**:
   - Only ROLE_PLATFORM_OWNER can create/submit templates
   - Event owners cannot modify templates

2. **Input Validation**:
   - Sanitize template bodies
   - Validate variable syntax
   - Check character limits
   - Prevent injection attacks

3. **API Credentials**:
   - Store Twilio credentials in database (encrypted)
   - Use environment variables for defaults
   - Never expose in client-side code

4. **Rate Limiting**:
   - Limit template submissions per hour
   - Prevent spam/abuse
   - Queue submissions if needed

## Error Handling

### Common Errors

1. **Invalid Template Body**:
   - Missing variables
   - Exceeded character limit
   - Invalid syntax
   → Show validation errors in UI

2. **Twilio API Errors**:
   - Authentication failed
   - Rate limit exceeded
   - Invalid content format
   → Retry with exponential backoff

3. **WhatsApp Rejection**:
   - Policy violation
   - Inappropriate content
   - Missing required fields
   → Display rejection reason, allow editing

## Success Metrics

1. **Template Creation Time**: < 2 minutes per template
2. **Submission Success Rate**: > 95%
3. **Approval Rate**: > 80%
4. **Average Approval Time**: Tracked and displayed

---

**Implementation Start**: February 2, 2026
**Estimated Completion**: Same day (4-6 hours)
**Current Status**: Phase 2 - Building API Client
