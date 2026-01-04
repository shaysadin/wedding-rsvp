# CLAUDE.md - Project Context for AI Assistants

## What This Project Is

**Wedinex** (formerly RSVP Manager) - A comprehensive wedding event management SaaS platform primarily built for the Israeli market (Hebrew RTL + English). Handles RSVPs, guest management, seating arrangements, automated messaging, voice AI calls, supplier tracking, task management, and gift payments.

**Product Name**: Wedinex (see `config/site.ts`)
**Package Name**: rsvp-manager

---

## Tech Stack

### Core
- **Next.js 16** with App Router (Turbopack enabled)
- **React 19**
- **TypeScript 5.5**
- **Prisma 5** with PostgreSQL (Neon)

### Auth & Payments
- **NextAuth v5 (Auth.js)** - JWT strategy, Google OAuth + email magic links
- **Stripe** - Subscription billing with 4 tiers: FREE, BASIC, ADVANCED, PREMIUM, BUSINESS

### UI
- **Tailwind CSS 3.4** with custom config
- **shadcn/ui** (Radix primitives)
- **Framer Motion** for animations
- **Lucide React** icons
- **next-themes** for dark mode

### Communications
- **Twilio** - SMS and WhatsApp messaging
- **Resend** - Transactional email
- **VAPI** - Voice AI agent for automated phone calls

### Storage
- **Cloudflare R2** - Primary file storage (invitations, templates, images)
- **Cloudinary** - Image transformations

### Image & Document Processing
- **Puppeteer** - HTML to PNG rendering (headless browser)
- **Sharp** - High-performance image processing and manipulation
- **pdf-lib** - PDF parsing and dimension extraction
- **Canvas** - Server-side canvas operations

### i18n
- **next-intl** - Hebrew (default, RTL) + English
- Locale routing: `/[locale]/...`

---

## Directory Structure

```
app/
  [locale]/           # Localized routes (en/he)
    (protected)/      # Auth-required pages
      dashboard/      # Main app
      admin/          # Admin panel
    (public)/         # Public pages (login, register)
  api/                # API routes
    cron/             # Vercel cron jobs
    stripe/           # Stripe webhooks
    twilio/           # WhatsApp webhooks
    vapi/             # Voice AI webhooks

actions/              # Server Actions (mutation logic)
components/
  ui/                 # shadcn/ui components
  shared/             # Reusable components (Icons, MaxWidthWrapper)
  [feature]/          # Feature-specific components (guests, events, automation)
config/               # App configuration (site, dashboard nav, plans)
lib/
  automation/         # Automation flow engine
  invitations/        # Invitation generation system (PDF/HTML to PNG)
  notifications/      # SMS/WhatsApp sending
  payments/           # Gift payment processing (Meshulam)
  pdf/                # Legacy PDF utilities
  validations/        # Zod schemas
messages/             # i18n translations (en.json, he.json)
prisma/               # Database schema
types/                # TypeScript type definitions
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

### Component Pattern
- PascalCase file names: `AddGuestDialog.tsx`
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
- **Files**: kebab-case (`add-guest-dialog.tsx`)
- **Components**: PascalCase (`AddGuestDialog`)
- **Actions**: camelCase (`createGuest`, `updateGuest`)
- **Database columns**: snake_case via `@map()`
- **Types**: PascalCase (`CreateGuestInput`)

### Imports
- Use `@/` alias for absolute imports
- Group: external → internal → relative
- Prisma enums imported from `@prisma/client`

### Error Handling
Actions return `{ error: string }` or `{ success: true, data }` pattern

### RTL Support
- Hebrew is default locale
- Use `isRTL` checks for directional UI
- Tailwind `rtl:` variants where needed

### Icons
All icons through `components/shared/icons.tsx` - exports Lucide icons as `Icons` object

---

## Current Development State

### Active Modules
1. **Automation Flows** - Event-driven messaging (NO_RESPONSE_WHATSAPP, NO_RESPONSE_SMS, BEFORE_EVENT, AFTER_EVENT triggers) with custom RSVP confirmation messages
2. **Invitation Generation System** - NEW! Complete invitation creation pipeline:
   - Platform owner uploads complete PDF templates with sample text
   - Smart text region erasing with background color matching (Sharp)
   - HTML/CSS template rendering to high-quality PNG (Puppeteer)
   - Support for 24+ field types (couple names, dates, venue, etc.)
   - Wedding owners generate custom invitations by filling forms
   - Generated invitations stored in Cloudflare R2 (10GB free tier)
   - See `INVITATION_SYSTEM.md` for complete documentation
3. **Gift Payments** - Meshulam integration with 8% platform fee
4. **Task Management** - Kanban board for wedding planning
5. **Voice AI** - VAPI-powered phone calls for RSVP collection
6. **Bulk Messaging** - WhatsApp/SMS campaigns

### Cron Jobs (vercel.json)
- `process-bulk-jobs` - Daily at midnight
- `auto-close-events` - Daily at 1 AM
- `process-automation-flows` - Hourly

### Known TODOs in Codebase
- `actions/generate-user-stripe.ts:3` - Stripe session generation not implemented
- `actions/invitations.ts:266` - WhatsApp image template sending incomplete
- `lib/subscription.ts:64` - Subscription cancellation check incomplete
- `app/api/vapi/webhook/route.ts:24` - VAPI signature verification not implemented

### Invitation System - Pending UI Development
Backend complete, UI needed for:
- **Template Upload Page** (`admin/invitation-templates/new`) - Visual region marker for text areas
- **Invitation Generator Page** (`dashboard/events/[eventId]/invitations`) - Template browser and form builder
- See `INVITATION_SYSTEM.md` section "What You Need to Do" for details

### Deprecated (Legacy) Items
Schema contains many `@deprecated` triggers/actions for backward compatibility:
- `NO_RESPONSE` → use `NO_RESPONSE_WHATSAPP` or `NO_RESPONSE_SMS`
- `NO_RESPONSE_24H/48H/72H` → use `NO_RESPONSE_*` with `delayHours`
- `SEND_WHATSAPP_TEMPLATE` → use specific template actions
- Several event timing triggers consolidated

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

## Quick Reference

### Run Commands
```bash
npm run dev          # Development server
npm run build        # Production build
npm run db:push      # Push schema changes
npx prisma generate  # Regenerate client
npx prisma studio    # Database GUI
```

### Key Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `AUTH_SECRET` - NextAuth secret
- `NEXT_PUBLIC_APP_URL` - Base URL for links
- `STRIPE_*` - Payment processing
- `TWILIO_*` / `VAPI_*` - Communications
- `CLOUDFLARE_R2_*` - R2 storage for invitations, templates, files

### User Roles
- `ROLE_WEDDING_OWNER` - Standard user (default)
- `ROLE_ADMIN` - Platform admin
- `ROLE_PLATFORM_OWNER` - Super admin

### Plan Tiers
FREE → BASIC → ADVANCED → PREMIUM → BUSINESS
