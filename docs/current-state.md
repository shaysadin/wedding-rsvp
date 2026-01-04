# Current State

## Recently Completed

Based on recent commits and changes:
- **Invitation Generation System** (January 2026) - Complete backend implementation:
  - PDF template upload and conversion to PNG
  - Smart text region erasing with background color matching
  - HTML to PNG rendering with Puppeteer
  - Template field management with CSS positioning
  - Custom invitation generation for wedding owners
  - Support for 24+ field types (see `InvitationFieldType` enum)
  - Server actions: `uploadPdfTemplate`, `processPdfTemplate`, `generateCustomInvitation`, `previewInvitation`
  - Comprehensive documentation in `INVITATION_SYSTEM.md`
- **Automation Confirmation Messages** - Fixed to use custom pre-made RSVP confirmation messages
- Bulk messaging with progress animation
- Admin "Built by Groom" message feature
- Task management Kanban board
- Event archiving system
- WhatsApp phone number management per user
- Automation flow triggers split by channel (NO_RESPONSE_WHATSAPP, NO_RESPONSE_SMS)
- **UI Improvements**: Fixed z-index hierarchy (dialogs, selects, popovers), increased guest table height

## In Progress / Incomplete

### Invitation System
- **Backend**: ✅ COMPLETE
  - `lib/invitations/` - All utilities implemented
  - `actions/invitation-templates-new.ts` - Platform owner actions
  - `actions/generate-invitation.ts` - Wedding owner actions
  - Database schema updated with expanded field types
- **Frontend**: ❌ NOT STARTED
  - Admin template upload UI with visual region marker
  - Wedding owner template browser and form builder
  - See `INVITATION_SYSTEM.md` for UI requirements

### Automation Module
- ✅ System automation messages per event (rsvpConfirmedMessage, rsvpDeclinedMessage)
- ✅ Custom message editor functional
- ✅ Cron processor running hourly
- ✅ WhatsApp webhook using custom messages
- ✅ RSVP action using real notification service

### Gift Payments
- Schema complete (`GiftPayment`, `GiftPaymentSettings`)
- Meshulam provider structure in `lib/payments/`
- Public pages exist (`/gift/[guestSlug]`)
- Webhook route at `api/payments/gift/webhook/meshulam`

## Known TODOs

| File | Issue |
|------|-------|
| `actions/generate-user-stripe.ts:3` | Stripe session generation stub |
| `actions/invitations.ts:266` | WhatsApp image template sending incomplete |
| `actions/invitations.ts:352` | Status hardcoded to SENT, should be PENDING |
| `lib/subscription.ts:64` | `isCanceled: false` hardcoded |
| `api/vapi/webhook/route.ts:24` | Signature verification not implemented |
| `components/forms/user-role-form.tsx:83` | Option value state issue |
| `components/modals/delete-account-modal.tsx:71` | Subscription display not implemented |

**Note**: `actions/invitation-templates.ts:108` (PDF field extraction) is superseded by the new invitation system in `lib/invitations/` and `actions/invitation-templates-new.ts`.

## Blocked / Waiting

### External Dependencies
- **Meshulam API credentials** - Gift payments require production credentials
- **VAPI configuration** - Voice agent needs phone number provisioning per user

### Schema Migrations
- Many `@deprecated` enum values remain for backward compatibility
- Cannot remove until data migration confirms no usage

## Technical Debt

1. **Inconsistent error returns** - Some actions return `{ error }`, others throw
2. **Mixed notification types** - Legacy `NotificationType` values still in use
3. **Legacy invitation code** - Old `lib/pdf/` and `actions/invitation-templates.ts` can be removed once new system UI is built
4. **Hardcoded Hebrew strings** - Some components have inline Hebrew text
5. **Z-index hierarchy** - Recently standardized but needs testing across all dialogs/overlays

## Test Coverage

No test files found in repository. Testing appears manual.
