# Technical Decisions

This document captures key architectural and technical decisions made in the Wedinex project.

---

## Core Architecture

### Server Actions Over API Routes

Mutations use Server Actions (`"use server"`) instead of API routes.
- Simpler type safety
- Automatic revalidation with `revalidatePath()`
- Co-located validation
- Better developer experience

**Exception**: External webhooks (Stripe, Twilio, VAPI) use API routes.

### JWT Over Database Sessions

Auth uses JWT strategy (`session: { strategy: "jwt" }`).
- No session table queries on every request
- User data cached in token, refreshed on `trigger === "update"`
- Stateless - easier to scale

### Hebrew as Default Locale

Default locale is `he` (Hebrew), not `en`.
- Primary market is Israel
- RTL-first design approach
- English as secondary language
- All UI components designed RTL-first, then adapted for LTR

---

## Database Decisions

### Snake Case in Database

Prisma uses `@map()` for snake_case column names:
```prisma
createdAt DateTime @map("created_at")
```
- Matches PostgreSQL conventions
- TypeScript uses camelCase, DB uses snake_case
- Explicit mapping prevents confusion

### Deprecated Enums for Backward Compatibility

Schema keeps deprecated enum values:
```prisma
NO_RESPONSE_24H  // @deprecated Use NO_RESPONSE_WHATSAPP
```
- Existing database records still valid
- UI hides legacy options
- Gradual migration possible

### No Migration Files

Using `npx prisma db push` instead of migrations.
- Faster iteration during development
- Single production database (Neon)
- Schema is source of truth
- **Risk**: No rollback capability

---

## Validation & Security

### Zod for All Validation

All input validation via Zod schemas in `lib/validations/`:
```typescript
const data = schema.parse(input);
```
- Type inference with `z.infer<>`
- Consistent error messages
- Schema reuse across actions

### Rate Limiting in Actions

Rate limiting via `lib/rate-limit.ts`:
```typescript
if (await isRateLimited(userId, RATE_LIMIT_PRESETS.STANDARD)) {
  return { error: "Rate limited" };
}
```
- Per-user limits
- Preset configurations
- Applied at action level, not middleware

### Plan-Based Limits

Resource limits tied to plan tier:
```typescript
const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: { events: 1, whatsapp: 0, sms: 0, calls: 0 },
  // ...
};
```
- Enforced in Server Actions
- Checked before mutations
- Usage tracked in `UsageTracking` model

---

## UI Patterns

### Feature-Grouped Components

Components organized by feature, not by type:
```
components/
  guests/      # Guest-related components
  events/      # Event-related components
  automation/  # Automation UI
```
- Colocates related code
- Easier to find components
- Clear ownership

### Icons via Centralized Export

All icons imported from `components/shared/icons.tsx`:
```typescript
import { Icons } from "@/components/shared/icons";
<Icons.check />
```
- Single source of truth
- Easy to swap icon libraries
- Consistent icon usage

### Dynamic Imports for Heavy Components

Large components use `next/dynamic`:
```typescript
const GuestsTable = dynamic(() => import("..."), {
  loading: () => <GuestsTableSkeleton />,
});
```
- Reduces initial bundle
- Better loading UX
- Critical for Puppeteer-related code

---

## Invitation System

### Puppeteer for Invitation Rendering

HTML to PNG conversion uses Puppeteer headless browser:
- **Why not server-side canvas?** Canvas libraries have poor Hebrew/RTL support
- **Why not CSS-to-image services?** Need exact font matching and custom styling
- **Performance**: Singleton browser instance reused across requests
- **Quality**: 2x scale factor for retina displays

### Sharp for Image Processing

Text region erasing uses Sharp:
- **Smart background matching**: Samples surrounding pixels, fills with average color
- **No white boxes**: Blends erased regions with existing background
- **Performance**: Sharp is fastest image library for Node.js
- **PNG optimization**: Built-in compression

### PDF Template Approach

Platform owner uploads **complete PDFs** (not blank templates):
- **Reasoning**: Most users have pre-designed PDFs from designers
- **Text erasing**: System removes original text intelligently
- **Font matching**: Admin manually specifies matching web fonts
- **Flexibility**: Also supports pure HTML/CSS templates via `TemplateType` enum

### CSS Positioning Over PDF Coordinates

Template fields store CSS properties (top, left, width) not PDF coordinates:
- **Responsive**: Can adapt to different viewport sizes if needed
- **Web-native**: Direct mapping to HTML rendering
- **Flexibility**: Supports both absolute and relative positioning
- **Debugging**: Easier to test in browser DevTools

---

## Storage & Files

### Cloudflare R2 for All File Storage

All file storage (invitations, templates, images) uses Cloudflare R2:
- **Generous free tier**: 10GB storage vs Vercel Blob's 500MB
- **No egress fees**: Unlimited bandwidth out (huge cost savings)
- **S3-compatible**: Standard API, easy to migrate if needed
- **Already configured**: Project uses R2 (`lib/r2.ts`)
- **Long-lived URLs**: Uses 1-year signed URLs for "permanent" files

### Cloudinary for Image Transforms

Using Cloudinary for on-the-fly image transformations:
- URL-based transforms (no server processing)
- CDN delivery
- Complementary to R2 storage

---

## External Services

### Twilio for SMS/WhatsApp

- Most reliable for Israel market
- WhatsApp Business API integration
- Interactive button messages for RSVP

### VAPI for Voice AI

- Hebrew voice support
- Custom prompts per event
- Real-time call tracking
- Automatic RSVP updates via tool calls

### Meshulam for Gift Payments

- Israeli payment provider (local payment methods)
- Shekel support
- Webhook-based status updates

### Resend for Email

- Simple API
- High deliverability
- React Email templates

---

## Performance Decisions

### No Caching Layer

Currently no Redis or similar caching:
- Database queries are fast enough for current scale
- Prisma handles connection pooling
- May need to add caching for guest lists at scale

### Singleton Patterns

Reusing expensive instances:
- Puppeteer browser singleton
- Prisma client singleton
- Reduces cold start times

### Background Jobs via Cron

Long-running tasks handled via cron jobs:
- Automation processing (hourly)
- Bulk messaging (daily)
- Event archival (daily)

No real-time queue system (like Bull/Redis) - simpler but less flexible.

---

## Trade-offs Accepted

### No Test Suite

- Fast initial development
- Higher risk of regressions
- Manual testing required
- **Debt to address**

### Hardcoded Hebrew Strings

Some UI components have inline Hebrew:
- Faster initial development
- i18n retrofit needed
- **Debt to address**

### Single Database

No read replicas or sharding:
- Simpler architecture
- Neon handles connection pooling
- May need to address at scale

---

## Future Considerations

### If Adding Tests
- Jest + React Testing Library
- Test Server Actions with mocked Prisma
- E2E tests with Playwright

### If Adding Caching
- Redis for session data
- Cache guest lists per event
- Invalidate on mutations

### If Adding Real-time
- Consider Pusher or Ably
- WebSocket for live updates
- Server-Sent Events for simpler cases
