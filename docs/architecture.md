# Architecture

## App Structure

```
app/
├── [locale]/                    # i18n routing (he/en)
│   ├── (protected)/             # Auth-required routes
│   │   ├── dashboard/           # Main app (events list, billing, settings)
│   │   ├── admin/               # Platform owner admin panel
│   │   │   ├── users/           # User management
│   │   │   ├── messaging/       # Messaging settings
│   │   │   ├── vapi/            # Voice AI settings
│   │   │   ├── invitations/     # Template management
│   │   │   ├── payments/        # Payment settings
│   │   │   ├── templates/       # RSVP templates
│   │   │   ├── automation/      # System automation
│   │   │   └── settings/        # Global settings
│   │   └── events/[eventId]/    # Event-specific pages
│   │       ├── guests/          # Guest management
│   │       ├── rsvp/            # RSVP settings
│   │       ├── invitations/     # Invitation generation
│   │       ├── automations/     # Workflow builder
│   │       ├── seating/         # Table planner
│   │       ├── tasks/           # Task kanban
│   │       ├── suppliers/       # Vendor management
│   │       ├── messages/        # Message templates
│   │       ├── customize/       # RSVP page styling
│   │       ├── voice-agent/     # VAPI configuration
│   │       └── gifts/           # Gift settings
│   ├── (auth)/                  # Login, register, magic link
│   ├── (marketing)/             # Landing, pricing, blog
│   └── (public)/                # Locale-aware public routes
│       └── hostess/[eventId]/   # Hostess check-in page
├── (public)/                    # Non-localized public routes
│   ├── rsvp/[slug]/             # Guest RSVP pages
│   └── gift/[guestSlug]/        # Gift payment pages
└── api/                         # API routes
    ├── auth/[...nextauth]/      # NextAuth
    ├── cron/                    # Scheduled jobs
    │   ├── process-automation-flows/
    │   ├── process-bulk-jobs/
    │   └── auto-close-events/
    ├── stripe/                  # Payment webhooks
    │   ├── webhook/             # Main webhook handler
    │   ├── create-checkout-session/
    │   ├── create-subscription/
    │   ├── upgrade-subscription/
    │   ├── cancel-subscription/
    │   ├── payment-method/
    │   ├── customer-portal/
    │   ├── preview-proration/
    │   └── cancel-scheduled-change/
    ├── twilio/                  # WhatsApp webhooks
    │   └── whatsapp/
    ├── vapi/                    # Voice AI webhooks
    │   ├── webhook/
    │   └── tools/
    │       ├── update-rsvp/
    │       └── get-wedding-info/
    ├── bulk-messages/           # Batch messaging
    │   ├── start/
    │   └── [jobId]/
    │       ├── status/
    │       ├── continue/
    │       └── cancel/
    ├── payments/
    │   └── gift/webhook/meshulam/
    ├── admin/
    │   ├── upload-template/
    │   ├── scan-template/       # AI template field scanning
    │   └── test-auth/
    └── user/                    # User profile endpoints
```

## Data Flow

### Standard Mutation Flow
```
Client Component
      ↓
Server Action (actions/*.ts)
      ↓
Zod Validation (lib/validations/*.ts)
      ↓
Authorization Check (getCurrentUser)
      ↓
Prisma Query (lib/db.ts)
      ↓
revalidatePath() → UI Update
```

### Notification Flow
```
Action triggers notification
      ↓
lib/notifications/real-service.ts
      ↓
Channel selection (WhatsApp/SMS/Email)
      ↓
WhatsApp → Twilio (always)
SMS → Provider factory (Twilio or Upsend based on settings)
Email → Resend
      ↓
NotificationLog created (audit trail)
      ↓
Usage tracking updated
```

### SMS Provider Architecture
```
lib/notifications/sms-providers/
├── types.ts          # SmsProvider interface
├── index.ts          # createSmsProvider() factory
├── twilio-sms.ts     # Twilio implementation
└── upsend-sms.ts     # Upsend implementation (Israeli)

Provider selected via MessagingProviderSettings.smsProvider field
```

### Automation Flow
```
Trigger event (RSVP change, scheduled time)
      ↓
Cron: api/cron/process-automation-flows
      ↓
lib/automation/trigger-checkers.ts
      ↓
lib/automation/action-executor.ts
      ↓
AutomationFlowExecution updated
```

## Key Layers

| Layer | Location | Purpose |
|-------|----------|---------|
| Pages | `app/[locale]/` | Route handlers, data fetching |
| Actions | `actions/` | Mutations with auth + validation |
| Components | `components/` | UI (feature-grouped) |
| Lib | `lib/` | Shared utilities, integrations |
| Config | `config/` | Static configuration |
| Hooks | `hooks/` | Custom React hooks |
| Contexts | `contexts/` | React context providers |

## Module Boundaries

### Core Domain
- **Events** → `WeddingEvent` model, owner-scoped
- **Guests** → `Guest` + `GuestRsvp`, event-scoped
- **Notifications** → `NotificationLog`, tracks all messaging

### Feature Modules

| Module | Lib Path | Models | Actions File |
|--------|----------|--------|--------------|
| Automation | `lib/automation/` | AutomationFlow, AutomationFlowExecution | `actions/automation.ts` |
| Invitations | `lib/invitations/` | InvitationTemplate, GeneratedInvitation | `actions/generate-invitation.ts` |
| Seating | `lib/validations/seating.ts` | WeddingTable, TableAssignment, VenueBlock | `actions/seating.ts` |
| Tasks | - | WeddingTask, TaskNote | `actions/tasks.ts` |
| Suppliers | - | Supplier, SupplierPayment | `actions/suppliers.ts` |
| Gifts | `lib/payments/` | GiftPayment, GiftPaymentSettings | `actions/gift-payments.ts` |
| Voice | `lib/vapi/` | VapiCallJob, VapiCallLog, VapiEmbedding | `actions/vapi/` |
| Bulk Messaging | `lib/bulk-messaging/` | BulkMessageJob, BulkMessageJobItem | `actions/bulk-notifications.ts` |
| SMS Providers | `lib/notifications/sms-providers/` | MessagingProviderSettings | `actions/messaging-settings.ts` |
| Collaboration | `lib/permissions.ts` | EventCollaborator, EventInvitation | `actions/collaborators.ts`, `actions/invitations.ts` |

## External Integrations

| Service | Purpose | Entry Point | Auth |
|---------|---------|-------------|------|
| Stripe | Subscriptions | `api/stripe/webhook`, `lib/stripe.ts` | Webhook signature |
| Twilio | WhatsApp + SMS | `api/twilio/whatsapp`, `lib/notifications/` | Account SID + Auth Token |
| Upsend | SMS (Israeli) | `lib/notifications/sms-providers/upsend-sms.ts` | Basic Auth (username:token) |
| VAPI | Voice AI | `api/vapi/webhook`, `lib/vapi/` | API Key |
| Resend | Email | `lib/email.ts` | API Key |
| Cloudflare R2 | File storage | `lib/r2.ts` | Access Keys |
| Cloudinary | Image transforms | `lib/cloudinary.ts` | URL-based |
| Meshulam | Gift payments | `api/payments/gift/webhook/meshulam` | Merchant credentials |
| Google Gemini | AI features | `lib/gemini/` | API Key |

## Authentication Flow

```
NextAuth (auth.ts)
      ↓
JWT Strategy (session in cookie)
      ↓
getCurrentUser() (lib/session.ts)
      ↓
Role check (UserRole enum)
      ↓
  ROLE_PLATFORM_OWNER → Admin access
  ROLE_WEDDING_OWNER  → Standard user access
```

## Authorization Patterns

### Role-Based Access
```typescript
const user = await getCurrentUser();
if (user.role !== UserRole.ROLE_PLATFORM_OWNER) {
  return { error: "Unauthorized" };
}
```

### Resource Ownership
```typescript
const event = await prisma.weddingEvent.findFirst({
  where: { id: eventId, ownerId: user.id }
});
if (!event) return { error: "Not found" };
```

### Collaborator Access
```typescript
import { canAccessEvent } from "@/lib/permissions";

const hasAccess = await canAccessEvent(eventId, user.id, "EDITOR");
if (!hasAccess) return { error: "Unauthorized" };
```
- Checks owner first, then collaborator role
- Supports "VIEWER" and "EDITOR" roles
- Used by seating actions for multi-user editing

### Plan-Based Limits
```typescript
import { getPlanLimits } from "@/config/plans";
const limits = getPlanLimits(user.plan);
if (user.messageCount >= limits.whatsapp) {
  return { error: "Plan limit reached" };
}
```

## Cron Jobs

Defined in `vercel.json`, handled by `api/cron/`:

| Job | Schedule | Purpose |
|-----|----------|---------|
| `process-automation-flows` | Hourly | Execute pending automations |
| `process-bulk-jobs` | Daily midnight | Process batch messaging |
| `auto-close-events` | Daily 1 AM | Archive past events |

## Database Schema Highlights

### Indexes
- All foreign keys indexed
- `Guest.slug` unique index for RSVP lookup
- `NotificationLog` composite indexes for filtering

### Cascade Deletes
- `WeddingEvent` deletion cascades to all child entities
- `User` deletion cascades to events (careful!)

### Soft Deletes
- Events can be archived via `EventArchive` model
- No soft delete pattern on other models

## Performance Patterns

### Dynamic Imports
```typescript
const HeavyComponent = dynamic(() => import("./HeavyComponent"), {
  loading: () => <Skeleton />,
});
```

### Singleton Instances
- Puppeteer browser reused across requests
- Prisma client singleton in `lib/db.ts`

### Rate Limiting
```typescript
if (await isRateLimited(userId, RATE_LIMIT_PRESETS.STANDARD)) {
  return { error: "Rate limited" };
}
```

## File Storage Strategy

All files stored in Cloudflare R2:
- **Invitations**: `invitations/{eventId}/{filename}.png`
- **Templates**: `templates/{templateId}/{filename}.png`
- **User uploads**: `uploads/{userId}/{filename}`
- **URLs**: 1-year signed URLs for "permanent" access
