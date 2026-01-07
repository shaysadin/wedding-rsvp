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
```

---

## Tech Stack

### Core
- **Next.js 16** with App Router (Turbopack enabled)
- **React 19** / **TypeScript 5.5** (strict mode disabled, strictNullChecks enabled)
- **Prisma 5** with PostgreSQL (Neon)

### Auth & Payments
- **NextAuth v5 (Auth.js)** - JWT strategy, Google OAuth + email magic links
- **Stripe** - Subscription billing (FREE, BASIC, ADVANCED, PREMIUM, BUSINESS tiers)

### UI
- **Tailwind CSS 3.4** + **shadcn/ui** (Radix primitives)
- **Framer Motion** for animations
- **next-themes** for dark mode

### Communications
- **Twilio** - SMS and WhatsApp messaging
- **Resend** - Transactional email
- **VAPI** - Voice AI agent for automated phone calls

### Storage & Processing
- **Cloudflare R2** - File storage (invitations, templates, images)
- **Puppeteer** / **Sharp** / **pdf-lib** - Invitation generation pipeline

### i18n
- **next-intl** - Hebrew (default, RTL) + English
- Locale routing: `/[locale]/...`

---

## Directory Structure

```
app/
  [locale]/           # Localized routes (en/he)
    (protected)/      # Auth-required pages (dashboard, admin)
    (public)/         # Public pages (login, register)
  api/                # API routes (cron, stripe, twilio, vapi webhooks)

actions/              # Server Actions (mutation logic)
components/
  ui/                 # shadcn/ui components
  shared/             # Reusable components (Icons, MaxWidthWrapper)
  [feature]/          # Feature-specific components
config/               # App configuration (site, dashboard nav, plans)
lib/
  automation/         # Automation flow engine
  invitations/        # Invitation generation system
  notifications/      # SMS/WhatsApp sending
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

### Error Handling
Actions return `{ error: string }` or `{ success: true, data }` pattern.

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

### Automation Flows
Event-driven messaging system with triggers: NO_RESPONSE_WHATSAPP, NO_RESPONSE_SMS, BEFORE_EVENT, AFTER_EVENT. Custom RSVP confirmation messages.

### Invitation Generation
Complete pipeline: PDF upload -> text region erasing (Sharp) -> HTML/CSS rendering (Puppeteer) -> PNG output -> R2 storage. See `INVITATION_SYSTEM.md` for details.

### Cron Jobs (vercel.json)
- `process-bulk-jobs` - Daily at midnight
- `auto-close-events` - Daily at 1 AM
- `process-automation-flows` - Hourly

### Deprecated Schema Items
Schema contains `@deprecated` triggers/actions for backward compatibility:
- `NO_RESPONSE` -> use `NO_RESPONSE_WHATSAPP` or `NO_RESPONSE_SMS`
- `NO_RESPONSE_24H/48H/72H` -> use `NO_RESPONSE_*` with `delayHours`

---

## Key Environment Variables

```
DATABASE_URL          # PostgreSQL connection (Neon)
AUTH_SECRET           # NextAuth secret
NEXT_PUBLIC_APP_URL   # Base URL for links
STRIPE_*              # Payment processing
TWILIO_*              # SMS/WhatsApp
VAPI_*                # Voice AI
CLOUDFLARE_R2_*       # File storage
RESEND_API_KEY        # Email delivery
```
