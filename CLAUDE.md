# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Wedinex** - A wedding event management SaaS platform for the Israeli market (Hebrew RTL + English). Handles RSVPs, guest management, seating arrangements, automated messaging, voice AI calls, supplier tracking, task management, invitation generation, and gift payments.

**Product Name**: Wedinex (see `config/site.ts`)
**Package Name**: rsvp-manager

---

## Commands

```bash
# Development
npm run dev          # Development server
npm run turbo        # Development with Turbopack (faster)
npm run build        # Production build
npm run lint         # Run ESLint

# Database
npm run db:push               # Push schema changes to database
npm run db:seed-templates     # Seed invitation templates
npx prisma generate           # Regenerate Prisma client
npx prisma studio             # Database GUI

# Other
npm run email        # Email template dev server (port 3333)

# Note: No test suite configured yet
```

---

## Tech Stack

### Core
- **Next.js 16.0.7** with App Router (Turbopack enabled)
- **React 19.2.1** / **TypeScript 5.5** (strict mode disabled, strictNullChecks enabled)
- **Prisma 5.17.0** with PostgreSQL (Neon)
- **Node 18** (see `.nvmrc`)

### Auth & Payments
- **NextAuth v5 (Auth.js 5.0.0-beta.30)** - JWT strategy, Google OAuth + email magic links
- **Stripe 20.0.0** - Subscription billing (FREE, BASIC, ADVANCED, PREMIUM, BUSINESS tiers)
- **Meshulam** - Gift payment processing (Israeli payment provider)

### UI
- **Tailwind CSS 3.4** + **shadcn/ui** (Radix primitives)
- **Framer Motion 12.23** for animations
- **next-themes** for dark mode
- **Recharts 3.5.1** for data visualization
- **Lucide React 0.555** - Icons (centralized via `components/shared/icons.tsx`)
- **Contentlayer2** for blog/docs MDX content

### Communications
- **Twilio 5.10.7** - WhatsApp messaging + SMS (global provider)
- **Upsend** - SMS provider for Israeli market (~₪0.07/SMS vs ~$0.26 Twilio) - **NEW, needs testing**
- **Resend 3.5.0** - Transactional email
- **react-email 5.0.5** - Email template rendering
- **VAPI** - Voice AI agent for automated phone calls

### Storage & Processing
- **Cloudflare R2** - File storage (invitations, templates, images)
- **Puppeteer 24.34** - HTML to PNG rendering
- **Sharp 0.33.5** - Image processing
- **pdf-lib 1.17.1** / **pdfjs-dist 5.4** - PDF parsing
- **Canvas 3.2.0** - Server-side canvas operations
- **XLSX 0.18.5** - Excel import for guests

### AI
- **Google Gemini 2.0 Flash** - AI features (see `lib/gemini/`)
  - Invitation template scanning: detects text fields and suggests field types
  - `scanInvitationTemplate()` function for image analysis

### i18n
- **next-intl 4.5.8** - Hebrew (default, RTL) + English
- Locale routing: `/[locale]/...`
- Translation files: `messages/en.json` (69KB), `messages/he.json` (84KB)

---

## Directory Structure

```
app/
  [locale]/                    # Localized routes (he/en)
    (protected)/               # Auth-required routes
      dashboard/               # Main app (My Events, Billing, Settings)
      admin/                   # Platform owner admin panel
      events/[eventId]/        # Event-specific pages
        guests/                # Guest management
        rsvp/                  # RSVP customization
        invitations/           # Invitation generation
        automations/           # Workflow management
        seating/               # Seating planner
        tasks/                 # Task kanban board
        suppliers/             # Vendor management
        messages/              # Message templates
        customize/             # RSVP page styling
        voice-agent/           # VAPI configuration
        gifts/                 # Gift settings
    (auth)/                    # Login, register, magic link
    (marketing)/               # Landing, pricing, blog
  [locale]/(public)/           # Locale-aware public routes
    hostess/[eventId]/         # Hostess check-in page
  (public)/                    # Non-localized public routes
    rsvp/[slug]/               # Guest RSVP pages
    gift/[guestSlug]/          # Gift payment pages
  api/                         # API routes
    auth/[...nextauth]/        # NextAuth
    cron/                      # Scheduled jobs (3 cron jobs)
    stripe/                    # Payment webhooks (9 endpoints)
    twilio/                    # WhatsApp webhooks
    vapi/                      # Voice AI webhooks + tools
    bulk-messages/             # Batch messaging API
    payments/gift/webhook/     # Meshulam gift payment webhook
    admin/                     # Admin API endpoints
      scan-template/           # AI template field scanning
    user/                      # User profile endpoints

actions/                       # Server Actions (30+ files)
  admin.ts                     # User/system management
  automation.ts                # Workflow actions
  events.ts                    # Event CRUD
  guests.ts                    # Guest management
  generate-invitation.ts       # Invitation generation
  gift-payments.ts             # Gift handling
  notifications.ts             # Messaging actions
  rsvp.ts                      # RSVP responses
  rsvp-settings.ts             # Page customization
  seating.ts                   # Table assignments
  suppliers.ts                 # Vendor management
  tasks.ts                     # Task management
  bulk-notifications.ts        # Batch messaging
  messaging-settings.ts        # Provider config
  vapi/                        # Voice agent actions

components/                    # React components (27+ feature groups)
  ui/                          # shadcn/ui base components
  shared/                      # Common (icons, headers, max-width-wrapper)
  layout/                      # Layouts and navigation
  admin/                       # Admin panel UI
  automation/                  # Workflow builder UI
  guests/                      # Guest table and forms
  events/                      # Event list and detail
  invitations/                 # Invitation UI
  rsvp/                        # RSVP page components
  seating/                     # Table planner UI
  tasks/                       # Kanban board
  suppliers/                   # Vendor list
  gifts/                       # Gift settings UI
  vapi/                        # Voice agent UI
  forms/                       # Form components
  modals/                      # Modal dialogs
  skeletons/                   # Loading skeletons

config/                        # App configuration
  site.ts                      # Site metadata
  dashboard.ts                 # Navigation config
  plans.ts                     # Plan definitions and helpers
  subscriptions.ts             # Stripe plan IDs
  landing.ts                   # Landing page content

contexts/                      # React contexts
  event-context.tsx            # Event state management

hooks/                         # Custom React hooks
  use-direction.ts             # RTL/LTR detection
  use-mounted.ts               # Mount state
  use-media-query.ts           # Responsive queries

lib/                           # Shared utilities (25+ files)
  automation/                  # Automation engine
    action-executor.ts         # Execute automation actions
    flow-processor.ts          # Process automation flows
    trigger-checkers.ts        # Check trigger conditions
    event-handlers.ts          # Handle automation events
  invitations/                 # Invitation generation
    pdf-to-png.ts              # PDF conversion
    image-processor.ts         # Text erasing
    html-to-png.ts             # HTML rendering
    generator.ts               # Main generation logic
  notifications/               # Messaging service
    real-service.ts            # Production messaging (multi-provider)
    twilio-service.ts          # Twilio integration (WhatsApp)
    whatsapp.ts                # WhatsApp sending
    template-renderer.ts       # Message templates
    sms-providers/             # SMS provider adapters
      types.ts                 # Provider interface
      index.ts                 # Factory + provider info
      twilio-sms.ts            # Twilio SMS implementation
      upsend-sms.ts            # Upsend SMS implementation (Israeli)
  vapi/                        # Voice AI integration
    client.ts                  # VAPI API client
    call-sync.ts               # Call synchronization
  payments/                    # Payment processing
    providers/meshulam/        # Meshulam integration
  gemini/                      # Google Gemini AI
  archive/                     # Event archival
  bulk-messaging/              # Batch job processor
  pdf/                         # Legacy PDF utilities
  i18n/                        # i18n configuration
  validations/                 # Zod schemas
  db.ts                        # Prisma client singleton
  r2.ts                        # Cloudflare R2 client
  email.ts                     # Email service
  rate-limit.ts                # Request rate limiting
  session.ts                   # Auth session helpers
  stripe.ts                    # Stripe utilities
  subscription.ts              # Plan management
  cloudinary.ts                # Image transforms

messages/                      # i18n translations
  en.json                      # English (69KB, 1000+ keys)
  he.json                      # Hebrew (84KB)

prisma/                        # Database
  schema.prisma                # 1,427 lines, 33+ models
  seed-templates.ts            # Seeding script

docs/                          # Project documentation
  architecture.md              # System architecture
  current-state.md             # Implementation status
  decisions.md                 # Design decisions

content/                       # MDX blog/docs content
email/                         # Email templates
public/                        # Static assets
styles/                        # Global CSS
types/                         # TypeScript definitions
```

---

## Architectural Patterns

### Server Actions Pattern
All mutations use Next.js Server Actions in `/actions/*.ts`:
```typescript
"use server";
export async function createGuest(input: CreateGuestInput) {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
    return { error: "Unauthorized" };
  }
  const validatedData = schema.parse(input);
  // ... prisma operations
  revalidatePath(`/${locale}/dashboard/events/${eventId}`);
  return { success: true, data };
}
```

### Validation Pattern
Zod schemas in `/lib/validations/`:
```typescript
export const createGuestSchema = z.object({...});
export type CreateGuestInput = z.input<typeof createGuestSchema>;
```

### Error Handling
Actions return `{ error: string }` or `{ success: true, data }` pattern.

### Component Pattern
- kebab-case file names: `add-guest-dialog.tsx`
- Components exported as PascalCase: `AddGuestDialog`
- Client components marked with `"use client";`
- Server components are default
- Heavy components use `dynamic()` with loading skeletons

### Database
- Prisma schema uses `@map()` for snake_case column names
- Relations use `onDelete: Cascade` where appropriate
- Indexes on foreign keys and frequently queried fields

### i18n Pattern
```typescript
const t = await getTranslations("namespace");
const locale = await getLocale();
```

### Authorization
- Role-based: `UserRole.ROLE_WEDDING_OWNER`, `ROLE_ADMIN`, `ROLE_PLATFORM_OWNER`
- Event ownership verified via `ownerId` field
- Plan-based limits (e.g., guest limits per tier)

---

## Coding Conventions

### Naming
- **Files**: kebab-case (`add-guest-dialog.tsx`, `guest-actions.ts`)
- **Components/Types**: PascalCase (`AddGuestDialog`, `CreateGuestInput`)
- **Functions/Actions**: camelCase (`createGuest`, `updateGuest`)
- **Database columns**: snake_case via `@map()`

### Imports
- Use `@/` alias for absolute imports
- Group: external -> internal -> relative
- Prisma enums imported from `@prisma/client`

### RTL Support
- Hebrew is default locale
- Use `isRTL` checks for directional UI
- Tailwind `rtl:` variants where needed

### Icons
All icons through `components/shared/icons.tsx` - exports Lucide icons as `Icons` object

### Tailwind
- ESLint enforces `tailwindcss/classnames-order`
- Use `cn()` utility for conditional classes

---

## What NOT to Change

### Do Not Modify Unless Explicitly Requested
1. **Prisma schema enum values** - Many have `@deprecated` items for backward compatibility with existing data
2. **Auth configuration** (`auth.ts`, `auth.config.ts`) - Complex OAuth/magic link setup
3. **Stripe webhook handlers** - Payment critical paths
4. **Database column mappings** - `@map()` values are production table names
5. **i18n message keys** - Used across the app, changes cascade
6. **Plan tier definitions** - Tied to Stripe products and user limits
7. **API route signatures** - External services depend on them (Twilio webhooks, VAPI webhooks)

### Sensitive Patterns
- Rate limiting in `/lib/rate-limit.ts`
- Session handling in `/lib/session.ts`
- Notification logging for audit trail
- Usage tracking for plan enforcement

---

## Active Features & Systems

### 1. Guest Management
- Import from Excel/CSV via XLSX library
- Guest filtering by status, group, side (bride/groom)
- Bulk contact management and messaging
- Expected guest count tracking
- Unique slug generation per guest for RSVP links

### 2. RSVP System
- Custom RSVP pages with 250+ styling fields (`RsvpPageSettings`)
- 3 statuses: PENDING, ACCEPTED, DECLINED
- Customizable welcome/thank you messages
- WhatsApp button-based RSVP (interactive)
- Guest count selection, countdown timers, location maps
- Template system (`RsvpTemplate`)

### 3. Notification System (Comprehensive Audit Trail)
- **Channels**: WhatsApp, SMS, Email
- **SMS Providers**: Twilio (global) or Upsend (Israeli, cheaper) - configurable in admin panel
- **Types**: INVITE, REMINDER, CONFIRMATION, IMAGE_INVITE, INTERACTIVE_INVITE, GUEST_COUNT_REQUEST, EVENT_DAY, THANK_YOU, TABLE_ASSIGNMENT
- **Statuses**: PENDING, SENT, DELIVERED, FAILED
- **Templates**: Per-event customizable message templates
- **WhatsApp Templates**: Admin-configurable with preview text (English + Hebrew) for send dialog
- **Bulk Jobs**: Track batch sending with progress tracking

### 4. Automation Flows
- **Triggers**: RSVP_CONFIRMED, RSVP_DECLINED, NO_RESPONSE_WHATSAPP, NO_RESPONSE_SMS, BEFORE_EVENT, AFTER_EVENT
- **Actions**: 10 WhatsApp templates, custom SMS/WhatsApp
- **Execution Tracking**: Per-guest execution status with retry logic
- **Status**: DRAFT, ACTIVE, PAUSED, ARCHIVED
- **Processing**: Hourly cron job

### 5. Invitation Generation (Complete)
- Complete pipeline: PDF upload -> text region erasing (Sharp) -> HTML/CSS rendering (Puppeteer) -> PNG output -> R2 storage
- AI-powered invitation creation stepper
- **AI Template Scanning**: Gemini 2.0 Flash scans uploaded images to suggest field types/positions
- Gallery of generated invitations with set-as-active functionality
- Guest table for bulk WhatsApp sending
- 24+ field types (couple names, dates, venues, families, custom)
- Platform owner template management with metadata editing (name, category, description)
- Template active/inactive status toggle
- See `INVITATION_SYSTEM.md` for backend details

### 6. Voice AI Agent (VAPI)
- Phone number provisioning per user
- Event-specific configuration
- Custom system prompts and first messages
- Real-time call tracking (7 statuses)
- Automatic RSVP updates from calls
- Embedded knowledge base (`VapiEmbedding`)
- Batch call jobs with execution tracking

### 7. Seating Management
- Interactive table planner with drag-and-drop
- Multiple table shapes (circle, rectangle, rectangleRounded, concave, concaveRounded)
- XY positioning and rotation (floor height up to 3000px)
- Venue blocks for layout design
- Guest-to-table assignments with RSVP status indicators (green=accepted, amber=pending, red=declined)
- **Auto-arrange feature**: Automatically create tables and assign guests
  - Groups by: Group → Side (organization), RSVP Status (priority: Approved > Pending)
  - Configurable table size and shape
  - Filter by side, group, or RSVP status
- Fullscreen editing mode with proper coordinate scaling
- Hostess check-in page (`/[locale]/hostess/[eventId]`) for event day

### 8. Task Management
- Kanban board (BACKLOG, TODO, DOING, DONE)
- Task notes/comments
- Due date tracking
- Event-scoped tasks

### 9. Supplier Management
- 14 supplier categories
- Status tracking (INQUIRY → CONFIRMED → COMPLETED)
- Payment tracking with 5 methods
- Budget integration (Decimal(10,2))
- Contact and contract management

### 10. Gift Payments
- Per-event configuration (`GiftPaymentSettings`)
- Meshulam payment provider (Israeli)
- 5 payment statuses (PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED)
- Greeting messages and images
- Manual cash gift support
- Per-guest payment linking

### 11. Event Archival
- Post-event data archival to R2
- Original event ID tracking
- Guest count snapshot
- Date-based searching

### Cron Jobs (vercel.json)
- `process-automation-flows` - Hourly
- `process-bulk-jobs` - Daily at midnight
- `auto-close-events` - Daily at 1 AM

### Deprecated Schema Items
Schema contains `@deprecated` triggers/actions for backward compatibility:
- `NO_RESPONSE` -> use `NO_RESPONSE_WHATSAPP` or `NO_RESPONSE_SMS`
- `NO_RESPONSE_24H/48H/72H` -> use `NO_RESPONSE_*` with `delayHours`

---

## Plan Tiers & Limits

| Plan | Events | WhatsApp | SMS | Voice Calls |
|------|--------|----------|-----|-------------|
| FREE | 1 | 0 | 0 | 0 |
| BASIC | 2 | 650 | 0 | 10 |
| ADVANCED | 3 | 750 | 30 | 20 |
| PREMIUM | 4 | 1000 | 50 | 40 |
| BUSINESS | ∞ | ∞ | ∞ | ∞ |

Plan enforcement in Server Actions via `lib/subscription.ts` and `config/plans.ts`.

---

## Database Schema Overview (33+ Models)

### Core Models
- **User** - Authentication with subscription fields
- **WeddingEvent** - Event parent entity with customization
- **Guest** - Per-event guests with RSVP tracking
- **GuestRsvp** - RSVP responses and counts

### Notification Models
- **NotificationLog** - All messaging audit trail
- **MessageTemplate** - Per-event custom templates
- **BulkMessageJob** / **BulkMessageJobItem** - Batch messaging

### RSVP Models
- **RsvpPageSettings** - 250+ styling fields
- **RsvpTemplate** - Reusable RSVP templates

### Messaging Models
- **MessagingProviderSettings** - Provider credentials
- **WhatsAppPhoneNumber** - Multi-phone support
- **WhatsAppButtonResponse** - Interactive button tracking
- **WhatsAppTemplate** - Approved Twilio templates with preview text (previewText, previewTextHe)

### Voice AI Models
- **VapiPhoneNumber**, **VapiEventSettings**, **VapiCallJob**, **VapiCallLog**, **VapiEmbedding**

### Invitation Models
- **InvitationTemplate** - Platform-owned templates
- **InvitationTemplateField** - 24+ field types
- **GeneratedInvitation** - User-generated invites

### Planning Models
- **WeddingTable**, **TableAssignment**, **VenueBlock** - Seating
- **WeddingTask**, **TaskNote** - Task management
- **Supplier**, **SupplierPayment** - Vendor management

### Payment Models
- **GiftPaymentSettings**, **GiftPayment**, **PaymentTransaction**

### System Models
- **AutomationFlowTemplate**, **AutomationFlow**, **AutomationFlowExecution**
- **CronJobLog** - Scheduled job audit trail
- **EventArchive** - Post-event archival
- **SystemSetting** - Key-value system config
- **UsageTracking** - Per-user monthly usage

---

## Key Environment Variables

```bash
# Database
DATABASE_URL              # PostgreSQL connection (Neon)

# Auth
AUTH_SECRET               # NextAuth secret
GOOGLE_CLIENT_ID          # Google OAuth
GOOGLE_CLIENT_SECRET      # Google OAuth

# App
NEXT_PUBLIC_APP_URL       # Base URL for links

# Payments
STRIPE_API_KEY            # Stripe secret key
STRIPE_WEBHOOK_SECRET     # Stripe webhook signing
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
MESHULAM_*                # Gift payment provider

# Communications
TWILIO_ACCOUNT_SID        # SMS/WhatsApp
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_NUMBER
RESEND_API_KEY            # Email delivery
VAPI_*                    # Voice AI

# Storage
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME

# AI
GOOGLE_AI_API_KEY         # Gemini AI
```
