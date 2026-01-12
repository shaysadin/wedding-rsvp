# Current State

**Last Updated**: January 2026

## Feature Completion Status

### Fully Complete

| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Authentication | ✅ | ✅ | Google OAuth + magic link |
| User Management | ✅ | ✅ | Roles, profiles, settings |
| Event Management | ✅ | ✅ | CRUD, archival |
| Guest Management | ✅ | ✅ | Excel import, filtering |
| RSVP System | ✅ | ✅ | Public pages, customization |
| Notification System | ✅ | ✅ | WhatsApp, SMS, Email |
| Bulk Messaging | ✅ | ✅ | Progress tracking |
| Automation Flows | ✅ | ✅ | Triggers, actions, execution |
| Seating Planner | ✅ | ✅ | Drag-and-drop tables |
| Task Management | ✅ | ✅ | Kanban board |
| Supplier Management | ✅ | ✅ | Payments, budget |
| Voice AI (VAPI) | ✅ | ✅ | Calls, RSVP updates |
| Invitation Generation | ✅ | ✅ | AI creation, gallery, sending |
| Billing (Stripe) | ✅ | ✅ | Subscriptions, portal |
| Admin Panel | ✅ | ✅ | User/system management |

### Partially Complete

| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Gift Payments | ✅ | ⚠️ | Needs Meshulam credentials |

> **Note**: Invitation Generation is fully complete (backend + UI with AI generation, gallery, and sending).

### Not Started

| Feature | Notes |
|---------|-------|
| Test Suite | No automated tests |
| Multi-language invitations | Hebrew/English toggle |
| Template marketplace | Public template gallery |

---

## Recently Completed

### January 2026 (Latest)

**Hostess Page**:
- New hostess view for event check-in at `app/[locale]/(public)/hostess/[eventId]/`
- Locale-aware routing (works with next-intl)
- Copy link functionality from seating page

**Dashboard UI Improvements**:
- Stats Grid now shows short labels on mobile (Events, Guests, Pending, Confirmed)
- Usage Tracking section title moved outside card for cleaner layout
- Mobile-responsive stat cards with smaller icons and text

**Seating/Floor Plan**:
- Max floor height increased to 3000px (was 1200px) for large venue layouts
- Min floor height decreased to 300px
- Fixed fullscreen mode table positioning and coordinate scaling
- Height resize handler closure bug fixed

**Invitation Template Management**:
- AI-powered template scanning using Google Gemini 2.0 Flash
- Scans uploaded invitation images and suggests field types/positions
- Accept individual or all AI suggestions
- Template metadata editing (name, category, description) after creation
- Active/inactive status toggle for templates

**WhatsApp Template Management**:
- Added preview text fields (English + Hebrew) to WhatsApp templates
- Admin can configure exact message preview shown in send dialog
- Database fields: `previewText`, `previewTextHe`
- Fallback to config templates if no preview text set

**Bug Fixes**:
- Fixed `requirePlatformOwner()` to check both `role` and `roles` fields
- Fixed invitation form dialog layout being cut off
- Fixed hostess page 404 error (next-intl locale routing)

### Earlier January 2026

**UI/UX Improvements**:
- Quick Stats Bar layout improvements for better readability
- DialogContent components updated for responsive design
- Theme selection disabled until mounted (hydration fix)
- Search functionality added to mobile header
- SelectTrigger enhanced for RTL support
- User menu improvements in navigation
- Mobile navigation component enhancements
- Image responsive handling improvements
- Pathname-based dynamic headers

**Invitation System Backend**:
- Complete PDF to PNG conversion pipeline
- Smart text region erasing with background matching
- HTML to PNG rendering with Puppeteer
- Template field management with CSS positioning
- Custom invitation generation for wedding owners
- Support for 24+ field types (see `InvitationFieldType` enum)
- Server actions: `uploadPdfTemplate`, `processPdfTemplate`, `generateCustomInvitation`, `previewInvitation`
- Comprehensive documentation in `INVITATION_SYSTEM.md`

**Automation System**:
- Fixed to use custom pre-made RSVP confirmation messages
- Trigger split by channel (NO_RESPONSE_WHATSAPP, NO_RESPONSE_SMS)
- Per-guest execution tracking with retry logic

**Other**:
- Bulk messaging with progress animation
- Admin "Built by Groom" message feature
- Event archiving system
- WhatsApp phone number management per user
- Z-index hierarchy standardization (dialogs, selects, popovers)
- Increased guest table height for better UX

---

## Known TODOs in Codebase

| File | Line | Issue |
|------|------|-------|
| `actions/generate-user-stripe.ts` | 3 | Stripe session generation stub |
| `actions/invitations.ts` | 266 | WhatsApp image template sending incomplete |
| `actions/invitations.ts` | 352 | Status hardcoded to SENT, should be PENDING |
| `lib/subscription.ts` | 64 | `isCanceled: false` hardcoded |
| `api/vapi/webhook/route.ts` | 24 | Signature verification not implemented |
| `components/forms/user-role-form.tsx` | 83 | Option value state issue |
| `components/modals/delete-account-modal.tsx` | 71 | Subscription display not implemented |

**Legacy Code to Remove**:
- `actions/invitation-templates.ts:108` - PDF field extraction superseded by new system
- `lib/pdf/` directory - Legacy PDF utilities replaced by `lib/invitations/`

---

## Blocked / Waiting

### External Dependencies
- **Meshulam API credentials** - Gift payments require production credentials
- **VAPI webhook signature** - Verification not implemented

### Schema Migrations
- Many `@deprecated` enum values remain for backward compatibility
- Cannot remove until data migration confirms no usage

---

## Technical Debt

### High Priority
1. **Missing tests** - No test suite configured
2. **Hardcoded Hebrew strings** - Some components have inline Hebrew text

### Medium Priority
4. **Inconsistent error returns** - Some actions return `{ error }`, others throw
5. **Mixed notification types** - Legacy `NotificationType` values still in use
6. **VAPI signature verification** - Webhook security incomplete

### Low Priority
7. **Legacy invitation code** - Old `lib/pdf/` and `actions/invitation-templates.ts`
8. **Z-index hierarchy** - Recently standardized, needs full testing
9. **Deprecated enums** - Backward compatibility items in schema

---

## API Endpoints Status

### Fully Functional
- `/api/auth/[...nextauth]` - Authentication
- `/api/stripe/*` - All 9 payment endpoints
- `/api/twilio/whatsapp` - WhatsApp webhook
- `/api/vapi/webhook` - Voice AI events
- `/api/vapi/tools/*` - Voice AI tools
- `/api/bulk-messages/*` - Batch messaging
- `/api/cron/*` - All 3 cron jobs
- `/api/admin/*` - Admin endpoints

### Needs Work
- `/api/payments/gift/webhook/meshulam` - Waiting for credentials

---

## Database Statistics

- **Schema size**: 1,427 lines
- **Models**: 33+
- **Enums**: 20+
- **Indexes**: Comprehensive coverage
- **Migrations**: Using `db push` (no migration files)

---

## Performance Observations

### Good
- Puppeteer singleton pattern for invitation generation
- Dynamic imports for heavy components
- Rate limiting on all actions
- R2 storage with no egress fees

### Needs Improvement
- First invitation generation slow (~2-3s) due to Puppeteer startup
- Large guest tables could benefit from virtualization
- No caching strategy for frequently accessed data

---

## Security Status

### Implemented
- Role-based access control (RBAC)
- Resource ownership verification
- Stripe webhook signature verification
- Rate limiting
- Input validation (Zod)
- JWT session strategy

### Needs Attention
- VAPI webhook signature verification
- Meshulam webhook security (pending integration)

---

## Next Steps (Recommended)

1. **Add Meshulam credentials** - Enable gift payments
2. **Implement VAPI signature verification** - Security fix
3. **Set up test framework** - Jest + Vitest + React Testing Library
4. **Clean up legacy code** - Remove old PDF utilities
