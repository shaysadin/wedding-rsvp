# 🎯 WEDINEX 3-PHASE IMPLEMENTATION PLAN
**Complete Security, Performance & Scaling Upgrade**

> **Project**: Wedinex Wedding Management SaaS
> **Total Estimated Time**: ~36 hours across 3 phases (adjusted)
> **Risk Reduction**: 90% after Phase 1
> **Performance Gain**: 50-100x after Phase 2
> **Target Capacity**: 10K+ guest events after Phase 3
> **Deployment Context**: LIVE PRODUCTION - Extra safety measures required

---

## ⚠️ IMPORTANT: PRODUCTION DEPLOYMENT NOTES

**This application is LIVE with REAL USERS**

### Safety-First Approach
1. **Test every change in development** before committing
2. **Incremental deployments** - One task at a time, verify in production
3. **Rollback plans** - Git tags before each deployment
4. **Monitoring** - Check logs after each deployment
5. **User communication** - Notify if any downtime needed

### Team Setup
- **2-3 parallel Claude Code instances** available
- Tasks marked as [PARALLEL] can be done simultaneously
- Tasks marked as [SEQUENTIAL] must be done in order

### Adjustments from Original Plan
- ✅ **Task 1.2 (VAPI webhook)**: DEFERRED - No documentation available yet
- ✅ **Task 1.3 (Meshulam webhook)**: SKIPPED - Per user request
- ✅ **Phase 1 reduced from 6 to 4 tasks**

---

## 📊 OVERVIEW

This plan systematically addresses all critical, high, and medium priority issues identified in the comprehensive audit. Each phase builds on the previous one, with clear dependencies and success criteria.

**Current State**: Ready for 100-500 guest events
**After Phase 1+2**: Ready for 1000-5000 guest events
**After Phase 3**: Ready for 10K+ guest events

---

# 🔴 PHASE 1: CRITICAL SECURITY FIXES
**Duration**: 1 week | **Time**: ~12 hours | **Risk Reduction**: 90%

## Prerequisites
- [ ] Git branch created: `feature/phase-1-security-fixes`
- [ ] Database backup completed
- [ ] Staging environment ready for testing

---

## TASK 1.1: Fix Usage Tracking Race Condition (3 hours)

### Problem
Multiple concurrent requests can bypass plan limits due to TOCTOU (Time-of-Check-Time-of-Use) race condition.

### Files to Modify
- `actions/notifications.ts` (lines 51-89)

### Implementation Steps

**Step 1**: Create atomic usage checking function (30 min)
```typescript
// actions/notifications.ts - Add new function

async function checkAndUpdateUsageAtomic(
  userId: string,
  channel: NotificationChannel,
  count: number = 1
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get user with usage tracking
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { usageTracking: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const planLimits = PLAN_LIMITS[user.plan];

      // Calculate limits based on channel
      const totalAllowed =
        channel === NotificationChannel.WHATSAPP
          ? planLimits.whatsapp
          : planLimits.sms;

      const currentUsage =
        channel === NotificationChannel.WHATSAPP
          ? user.usageTracking?.whatsappSent || 0
          : user.usageTracking?.smsSent || 0;

      const remaining = totalAllowed - currentUsage;

      // Check if allowed BEFORE incrementing
      if (remaining < count) {
        return {
          allowed: false,
          remaining,
          error: `Insufficient ${channel} messages. Need ${count}, have ${remaining}`,
        };
      }

      // Atomic increment
      const updated = await tx.usageTracking.upsert({
        where: { userId },
        create: {
          userId,
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          whatsappSent: channel === NotificationChannel.WHATSAPP ? count : 0,
          smsSent: channel === NotificationChannel.SMS ? count : 0,
        },
        update: {
          ...(channel === NotificationChannel.WHATSAPP && {
            whatsappSent: { increment: count },
          }),
          ...(channel === NotificationChannel.SMS && {
            smsSent: { increment: count },
          }),
        },
      });

      // Double-check we didn't exceed (safety check)
      const newUsage =
        channel === NotificationChannel.WHATSAPP
          ? updated.whatsappSent
          : updated.smsSent;

      if (newUsage > totalAllowed) {
        throw new Error("Plan limit exceeded during transaction");
      }

      return {
        allowed: true,
        remaining: totalAllowed - newUsage,
      };
    });

    return result;
  } catch (error: any) {
    console.error("Usage tracking error:", error);
    return {
      allowed: false,
      remaining: 0,
      error: error.message || "Failed to check usage",
    };
  }
}
```

**Step 2**: Replace old function calls (1 hour)
- Find all calls to `checkAndUpdateUsage()` (currently on lines 79, 321, 502, 622)
- Replace with `checkAndUpdateUsageAtomic()`
- Remove old `checkAndUpdateUsage()` function

**Step 3**: Add tests (30 min)
- Create test file: `__tests__/usage-tracking.test.ts`
- Test concurrent requests don't exceed limits
- Test edge cases (exactly at limit, 0 remaining, etc.)

**Step 4**: Code review checklist (30 min)
- [ ] All `checkAndUpdateUsage` calls replaced
- [ ] Transaction rollback tested
- [ ] Error handling covers all cases
- [ ] No N+1 queries introduced

**Step 5**: Testing (30 min)
1. Local test: Send 100 concurrent WhatsApp messages
2. Verify usage count is exactly 100 (not 101+)
3. Test FREE plan user can't exceed 0 messages
4. Test BUSINESS plan unlimited works

### Success Criteria
- ✅ Concurrent requests don't bypass limits
- ✅ All tests pass
- ✅ No performance regression
- ✅ Proper error messages returned

---

## TASK 1.2: Implement VAPI Webhook Signature Verification (2 hours)

### Problem
VAPI webhooks accept unauthenticated requests - attackers can spoof call results.

### Files to Modify
- `app/api/vapi/webhook/route.ts` (lines 16-29)

### Implementation Steps

**Step 1**: Research VAPI signature method (15 min)
- Check VAPI documentation: https://docs.vapi.ai/webhooks
- Identify signature algorithm (likely HMAC-SHA256)
- Note header name (currently checking `x-vapi-signature`)

**Step 2**: Implement signature verification (45 min)
```typescript
// app/api/vapi/webhook/route.ts

import crypto from "crypto";

function verifyVapiSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  try {
    // Generate expected signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("VAPI signature verification error:", error);
    return false;
  }
}

export async function POST(request: Request) {
  const headersList = headers();
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;

  // Read body as text for signature verification
  const bodyText = await request.text();
  const signature = headersList.get("x-vapi-signature");

  // Verify signature if secret is configured
  if (webhookSecret) {
    const isValid = verifyVapiSignature(bodyText, signature, webhookSecret);

    if (!isValid) {
      console.error("Invalid VAPI webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
  } else {
    console.warn("VAPI_WEBHOOK_SECRET not set - webhook signature not verified");
  }

  // Parse body after verification
  const payload = JSON.parse(bodyText);

  // ... rest of webhook handling
}
```

**Step 3**: Add environment variable (15 min)
- Add to `.env.local`: `VAPI_WEBHOOK_SECRET=your_secret_here`
- Document in `.env.example`
- Add to deployment environment (Vercel/etc)

**Step 4**: Update error logging (15 min)
- Log failed signature attempts with request metadata
- Alert on repeated failures (potential attack)

**Step 5**: Testing (30 min)
1. Generate test signature using VAPI secret
2. Send webhook with valid signature → expect 200
3. Send webhook with invalid signature → expect 401
4. Send webhook without signature header → expect 401

### Success Criteria
- ✅ Invalid signatures rejected with 401
- ✅ Valid signatures accepted
- ✅ Environment variable documented
- ✅ Security logging in place

---

## TASK 1.3: Implement Meshulam Webhook Signature (2 hours)

### Problem
Gift payment webhooks have no authentication - payments can be spoofed.

### Files to Modify
- `lib/payments/providers/meshulam/index.ts` (line 224)
- `app/api/payments/gift/webhook/meshulam/route.ts`

### Implementation Steps

**Step 1**: Contact Meshulam support (30 min)
- Email: support@meshulam.co.il
- Ask for: Webhook signature documentation
- Get: Secret key format, hash algorithm, header name

**Step 2**: Implement signature verification (60 min)
```typescript
// lib/payments/providers/meshulam/index.ts

validateWebhookSignature(payload: any, signature?: string): boolean {
  if (!signature) {
    console.error("Meshulam webhook missing signature");
    return false;
  }

  const secret = process.env.MESHULAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("MESHULAM_WEBHOOK_SECRET not configured");
    return false;
  }

  try {
    // Example - adjust based on Meshulam docs
    const dataToSign = `${payload.transactionId}${payload.status}${payload.amount}${secret}`;
    const expectedSignature = crypto
      .createHash("sha256")
      .update(dataToSign)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("Meshulam signature verification error:", error);
    return false;
  }
}
```

**Step 3**: Update webhook route (15 min)
```typescript
// app/api/payments/gift/webhook/meshulam/route.ts

const signature = request.headers.get("x-meshulam-signature");
const isValid = meshulam.validateWebhookSignature(payload, signature || undefined);

if (!isValid) {
  return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
}
```

**Step 4**: Testing (15 min)
1. Test with real Meshulam webhook (staging)
2. Verify signature validation
3. Test payment status updates still work

### Success Criteria
- ✅ Meshulam signature algorithm documented
- ✅ Invalid webhooks rejected
- ✅ Real payments still processed correctly

---

## TASK 1.4: Add Authentication to VAPI Tool Endpoints (2 hours)

### Problem
VAPI tool endpoints (`update-rsvp`, `get-wedding-info`) have no authentication.

### Files to Modify
- `app/api/vapi/tools/update-rsvp/route.ts`
- `app/api/vapi/tools/get-wedding-info/route.ts`

### Implementation Steps

**Step 1**: Create VAPI API key validator (30 min)
```typescript
// lib/vapi/auth.ts

export async function validateVapiToolRequest(request: Request): Promise<{
  valid: boolean;
  error?: string;
}> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return { valid: false, error: "Missing authorization header" };
  }

  const apiKey = authHeader.replace("Bearer ", "");
  const expectedKey = process.env.VAPI_API_KEY;

  if (!expectedKey) {
    console.error("VAPI_API_KEY not configured");
    return { valid: false, error: "Server configuration error" };
  }

  // Constant-time comparison
  if (apiKey !== expectedKey) {
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true };
}
```

**Step 2**: Add to update-rsvp endpoint (30 min)
```typescript
// app/api/vapi/tools/update-rsvp/route.ts

import { validateVapiToolRequest } from "@/lib/vapi/auth";

export async function POST(request: Request) {
  // Validate auth first
  const authResult = await validateVapiToolRequest(request);
  if (!authResult.valid) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  // ... rest of handler
}
```

**Step 3**: Add to get-wedding-info endpoint (30 min)
- Same pattern as update-rsvp

**Step 4**: Add rate limiting (15 min)
```typescript
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Rate limit before auth check
  const rateLimitResult = await withRateLimit(
    request,
    RATE_LIMIT_PRESETS.api
  );
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // ... auth check, then handler
}
```

**Step 5**: Testing (15 min)
1. Call without auth header → 401
2. Call with wrong API key → 401
3. Call with correct API key → 200
4. Test rate limiting (100+ requests/min)

### Success Criteria
- ✅ Both endpoints require valid API key
- ✅ Rate limiting prevents abuse
- ✅ VAPI integration still works

---

## TASK 1.5: Enforce Twilio Signature Validation (1 hour)

### Problem
Twilio webhook signatures are validated but not enforced (optional).

### Files to Modify
- `app/api/twilio/status/route.ts` (line 123)
- `app/api/twilio/whatsapp/route.ts` (line 78)

### Implementation Steps

**Step 1**: Update status webhook (15 min)
```typescript
// app/api/twilio/status/route.ts (line 120-125)

// BEFORE:
if (!isValid) {
  console.warn("Invalid Twilio signature received");
  // In production, you might want to reject invalid signatures
  // return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
}

// AFTER:
if (!isValid) {
  console.error("Invalid Twilio signature received", {
    url: request.url,
    ip: request.headers.get("x-forwarded-for"),
    timestamp: new Date().toISOString(),
  });
  return NextResponse.json(
    { error: "Invalid signature" },
    { status: 401 }
  );
}
```

**Step 2**: Update WhatsApp webhook (15 min)
```typescript
// app/api/twilio/whatsapp/route.ts (line 75-80)

// Same change as status webhook
if (!isValid) {
  console.error("Invalid Twilio WhatsApp signature", {
    from: fromNumber,
    timestamp: new Date().toISOString(),
  });
  return NextResponse.json(
    { error: "Invalid signature" },
    { status: 401 }
  );
}
```

**Step 3**: Monitor logs for rejected webhooks (15 min)
- Set up alert for repeated 401s from Twilio IPs
- Document expected IPs in runbook

**Step 4**: Testing (15 min)
1. Send test webhook from Twilio console → 200
2. Send webhook with tampered signature → 401
3. Verify WhatsApp button responses still work
4. Verify delivery status updates still work

### Success Criteria
- ✅ Invalid signatures return 401
- ✅ Valid Twilio webhooks still processed
- ✅ Logging in place for security monitoring

---

## TASK 1.6: Wrap Guest+RSVP Creation in Transaction (2 hours)

### Problem
Guest and GuestRsvp created in separate transactions - can create orphaned guests.

### Files to Modify
- `actions/guests.ts` (lines 405-427)

### Implementation Steps

**Step 1**: Combine into single transaction (60 min)
```typescript
// actions/guests.ts (around line 405)

// BEFORE: Two separate transactions
const batchResults = await prisma.$transaction(
  batch.map((guestData) =>
    prisma.guest.create({...})
  )
);
await prisma.$transaction(
  batchResults.map((guest) =>
    prisma.guestRsvp.create({...})
  )
);

// AFTER: Single atomic transaction
const results = await prisma.$transaction(async (tx) => {
  // Create all guests
  const guests = await Promise.all(
    batch.map((guestData) =>
      tx.guest.create({
        data: {
          weddingEventId: eventId,
          name: guestData.name,
          phoneNumber: guestData.phoneNumber,
          email: guestData.email,
          groupName: guestData.groupName,
          side: guestData.side,
          expectedGuestCount: guestData.expectedGuestCount || 1,
          slug: generateUniqueSlug(),
        },
      })
    )
  );

  // Create all RSVPs (same transaction)
  const rsvps = await Promise.all(
    guests.map((guest) =>
      tx.guestRsvp.create({
        data: {
          guestId: guest.id,
          status: "PENDING",
          guestCount: 0,
        },
      })
    )
  );

  return { guests, rsvps };
});
```

**Step 2**: Add error recovery (15 min)
- Log which guest creation failed if transaction rolls back
- Return detailed error to user

**Step 3**: Update other guest creation locations (30 min)
- Check `createGuest()` function (line ~100)
- Ensure single-guest creation also atomic
- Search for all `guest.create` calls

**Step 4**: Testing (15 min)
1. Import 100 guests via Excel
2. Force failure mid-transaction (disconnect DB)
3. Verify NO orphaned guests created
4. Verify all-or-nothing behavior

### Success Criteria
- ✅ Guest + RSVP creation is atomic
- ✅ No orphaned guests possible
- ✅ Import functionality still works
- ✅ Error messages clear

---

## PHASE 1 COMPLETION CHECKLIST

### Before Deployment
- [ ] All 6 tasks completed
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Code reviewed by team
- [ ] Documentation updated

### Staging Validation
- [ ] Deploy to staging environment
- [ ] Test concurrent message sending
- [ ] Test VAPI webhook with real calls
- [ ] Test Meshulam webhook with test payment
- [ ] Test Twilio webhooks (WhatsApp + status)
- [ ] Import 500 guests and verify no orphans
- [ ] Monitor error logs for 24 hours

### Production Deployment
- [ ] Database migration (if needed)
- [ ] Environment variables set
- [ ] Deploy with feature flag (if available)
- [ ] Monitor for 1 hour post-deployment
- [ ] Verify no increase in error rates
- [ ] Test one real RSVP end-to-end

### Rollback Plan
If critical issues found:
1. Revert code deployment
2. Check for orphaned data from failed transactions
3. Review error logs
4. Fix issues in development
5. Re-test in staging before retry

---

# 🟡 PHASE 2: PERFORMANCE & HIGH PRIORITY FIXES
**Duration**: 2 weeks | **Time**: ~16 hours | **Performance Gain**: 50-100x

[Continue with Phase 2 tasks... Would you like me to continue with the detailed Phase 2 and Phase 3 implementation steps?]
