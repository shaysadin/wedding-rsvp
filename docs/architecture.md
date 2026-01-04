# Architecture

## App Structure

```
app/
├── [locale]/                    # i18n routing (he/en)
│   ├── (protected)/             # Auth-required routes
│   │   ├── dashboard/           # Main app pages
│   │   └── admin/               # Admin panel
│   └── (public)/                # Public routes (login, register)
├── (public)/                    # Non-localized public routes
│   ├── rsvp/[slug]/             # Guest RSVP pages
│   └── gift/[guestSlug]/        # Gift payment pages
└── api/                         # API routes
    ├── cron/                    # Scheduled jobs
    ├── stripe/                  # Payment webhooks
    ├── twilio/                  # WhatsApp webhooks
    └── vapi/                    # Voice AI webhooks
```

## Data Flow

```
Client Component
      ↓
Server Action (actions/*.ts)
      ↓
Zod Validation (lib/validations/*.ts)
      ↓
Prisma Query (lib/db.ts)
      ↓
revalidatePath() → UI Update
```

## Key Layers

| Layer | Location | Purpose |
|-------|----------|---------|
| Pages | `app/[locale]/` | Route handlers, data fetching |
| Actions | `actions/` | Mutations with auth + validation |
| Components | `components/` | UI (feature-grouped) |
| Lib | `lib/` | Shared utilities, integrations |
| Config | `config/` | Static configuration |

## Module Boundaries

### Core Domain
- **Events** → `WeddingEvent` model, owner-scoped
- **Guests** → `Guest` + `GuestRsvp`, event-scoped
- **Notifications** → `NotificationLog`, tracks all messaging

### Feature Modules
- **Automation** → `lib/automation/`, `AutomationFlow` + `AutomationFlowExecution`
- **Invitations** → `lib/invitations/`, `InvitationTemplate` + `GeneratedInvitation` (NEW!)
  - PDF to PNG conversion with pdf-lib + Sharp
  - Smart text region erasing with background matching
  - HTML to PNG rendering with Puppeteer
  - Template-based generation with 24+ field types
- **Seating** → `WeddingTable`, `TableAssignment`, `VenueBlock`
- **Tasks** → `WeddingTask` with Kanban statuses
- **Suppliers** → `Supplier` with payments
- **Gifts** → `GiftPayment`, `GiftPaymentSettings`
- **Voice** → `VapiCallJob`, `VapiCallLog`

## External Integrations

| Service | Purpose | Entry Point |
|---------|---------|-------------|
| Stripe | Subscriptions | `api/stripe/webhook` |
| Twilio | SMS/WhatsApp | `api/twilio/whatsapp`, `lib/notifications/` |
| VAPI | Voice AI | `api/vapi/webhook` |
| Resend | Email | `lib/email.ts` |
| Cloudflare R2 | File storage (invitations, templates) | `lib/r2.ts` |
| Cloudinary | Image transforms | `lib/cloudinary.ts` |

## Authentication Flow

```
NextAuth (auth.ts)
      ↓
JWT Strategy (session in cookie)
      ↓
getCurrentUser() (lib/session.ts)
      ↓
Role check (UserRole enum)
```

## Cron Jobs

Defined in `vercel.json`, handled by `api/cron/`:
- `process-automation-flows` - Hourly
- `process-bulk-jobs` - Daily
- `auto-close-events` - Daily
