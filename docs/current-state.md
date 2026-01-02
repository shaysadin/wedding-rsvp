# Current State

## Recently Completed

Based on recent commits:
- Bulk messaging with progress animation
- Admin "Built by Groom" message feature
- Task management Kanban board
- Event archiving system
- WhatsApp phone number management per user
- Automation flow triggers split by channel (NO_RESPONSE_WHATSAPP, NO_RESPONSE_SMS)

## In Progress / Incomplete

### Automation Module
- System automation messages per event (rsvpConfirmedMessage, rsvpDeclinedMessage fields exist)
- Custom message editor functional
- Cron processor running hourly

### PDF Invitations
- `lib/pdf/` directory exists
- Template model in schema (`InvitationTemplate`, `InvitationTemplateField`)
- Field extraction disabled: `// TODO: Enable when pdf-lib is installed` (but pdf-lib IS installed)

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
3. **PDF field extraction** - Code disabled despite dependency installed
4. **Hardcoded Hebrew strings** - Some components have inline Hebrew text

## Test Coverage

No test files found in repository. Testing appears manual.
