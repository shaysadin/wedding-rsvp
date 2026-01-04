# Technical Decisions

## Server Actions Over API Routes

Mutations use Server Actions (`"use server"`) instead of API routes.
- Simpler type safety
- Automatic revalidation with `revalidatePath()`
- Co-located validation

## JWT Over Database Sessions

Auth uses JWT strategy (`session: { strategy: "jwt" }`).
- No session table queries on every request
- User data cached in token, refreshed on `trigger === "update"`

## Hebrew as Default Locale

Default locale is `he` (Hebrew), not `en`.
- Primary market is Israel
- RTL-first design approach
- English as secondary language

## Snake Case in Database

Prisma uses `@map()` for snake_case column names:
```prisma
createdAt DateTime @map("created_at")
```
- Matches PostgreSQL conventions
- TypeScript uses camelCase, DB uses snake_case

## Zod for Validation

All input validation via Zod schemas in `lib/validations/`:
```typescript
const data = schema.parse(input);
```
- Type inference with `z.infer<>`
- Consistent error messages

## Feature-Grouped Components

Components organized by feature, not by type:
```
components/
  guests/      # Guest-related components
  events/      # Event-related components
  automation/  # Automation UI
```

## Icons via Centralized Export

All icons imported from `components/shared/icons.tsx`:
```typescript
import { Icons } from "@/components/shared/icons";
<Icons.check />
```
- Single source of truth
- Easy to swap icon libraries

## Dynamic Imports for Heavy Components

Large components use `next/dynamic`:
```typescript
const GuestsTable = dynamic(() => import("..."), {
  loading: () => <GuestsTableSkeleton />,
});
```
- Reduces initial bundle
- Better loading UX

## Deprecated Enums for Backward Compatibility

Schema keeps deprecated enum values:
```prisma
NO_RESPONSE_24H  // @deprecated Use NO_RESPONSE_WHATSAPP
```
- Existing database records still valid
- UI hides legacy options

## Rate Limiting in Actions

Rate limiting via `lib/rate-limit.ts`:
```typescript
if (await isRateLimited(userId, RATE_LIMIT_PRESETS.STANDARD)) {
  return { error: "Rate limited" };
}
```
- Per-user limits
- Preset configurations

## Plan-Based Limits

Resource limits tied to plan tier:
```typescript
const PLAN_GUEST_LIMITS: Record<PlanTier, number> = {
  FREE: 50,
  BASIC: Infinity,
  ...
};
```
- Enforced in Server Actions
- Checked before mutations

## Puppeteer for Invitation Rendering

HTML to PNG conversion uses Puppeteer headless browser:
- **Why not server-side canvas?** Canvas libraries have poor Hebrew/RTL support
- **Why not CSS-to-image services?** Need exact font matching and custom styling
- **Performance**: Singleton browser instance reused across requests
- **Quality**: 2x scale factor for retina displays

## Sharp for Image Processing

Text region erasing uses Sharp:
- **Smart background matching**: Samples surrounding pixels, fills with average color
- **No white boxes**: Blends erased regions with existing background
- **Performance**: Sharp is fastest image library for Node.js
- **PNG optimization**: Built-in compression

## Cloudflare R2 for All File Storage

All file storage (invitations, templates, images) uses Cloudflare R2:
- **Generous free tier**: 10GB storage vs Vercel Blob's 500MB
- **No egress fees**: Unlimited bandwidth out (huge cost savings)
- **S3-compatible**: Standard API, easy to migrate if needed
- **Already configured**: Project already uses R2 (`lib/r2.ts`)
- **Long-lived URLs**: Uses 1-year signed URLs for "permanent" files like invitations
- **Cost-effective**: $0.015/GB after free tier vs Vercel Blob's higher pricing

## PDF Template Approach

Platform owner uploads **complete PDFs** (not blank templates):
- **Reasoning**: Most users have pre-designed PDFs from designers
- **Text erasing**: System removes original text intelligently
- **Font matching**: Admin manually specifies matching web fonts
- **Flexibility**: Also supports pure HTML/CSS templates via `TemplateType` enum

## CSS Positioning Over PDF Coordinates

Template fields store CSS properties (top, left, width) not PDF coordinates:
- **Responsive**: Can adapt to different viewport sizes if needed
- **Web-native**: Direct mapping to HTML rendering
- **Flexibility**: Supports both absolute and relative positioning
- **Debugging**: Easier to test in browser DevTools
