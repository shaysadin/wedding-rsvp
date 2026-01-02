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
