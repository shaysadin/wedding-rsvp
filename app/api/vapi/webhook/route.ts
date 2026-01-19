import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { prisma } from "@/lib/db";
import type { VapiWebhookEvent, VapiCallStatus } from "@/lib/vapi/types";
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { vapiWebhookSchema } from "@/lib/validations/webhooks";
import { logVoiceCallCost } from "@/lib/analytics/usage-tracking";

/**
 * VAPI Webhook Handler
 * Receives call lifecycle events from VAPI
 */
export async function POST(request: NextRequest) {
  // Rate limit webhook requests
  const rateLimitResult = withRateLimit(request, RATE_LIMIT_PRESETS.webhook);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();

    // Validate payload schema
    const validation = vapiWebhookSchema.safeParse(body);
    if (!validation.success) {
      console.error("Invalid VAPI webhook payload:", validation.error);
      return NextResponse.json(
        { error: "Invalid webhook payload", details: validation.error.issues },
        { status: 400 }
      );
    }

    const headersList = await headers();

    // Get webhook secret for verification (optional)
    const settings = await prisma.messagingProviderSettings.findFirst();
    const webhookSecret = settings?.vapiWebhookSecret;

    // If webhook secret is configured, verify it
    // Note: VAPI webhook verification method may differ - check their docs
    if (webhookSecret) {
      const signature = headersList.get("x-vapi-signature");
      // TODO: Implement proper signature verification based on VAPI docs
      // For now, we'll just log a warning if signature is missing
      if (!signature) {
        console.warn("VAPI webhook received without signature");
      }
    }

    const event = body as VapiWebhookEvent;
    const callId = event.call?.id;

    switch (event.type) {
      case "call.started":
        await handleCallStarted(event);
        break;

      case "call.ringing":
        await handleCallRinging(event);
        break;

      case "call.connected":
        await handleCallConnected(event);
        break;

      case "call.ended":
        await handleCallEnded(event);
        break;

      case "transcript":
        await handleTranscript(event);
        break;

      // Tool calls are handled by the tool routes, not the webhook
      case "tool-calls":
        // Ignore - handled by /api/vapi/tools/*
        break;

      default:
        // Silently ignore unhandled events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing VAPI webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle call started event
 */
async function handleCallStarted(event: VapiWebhookEvent) {
  const callId = event.call?.id;
  if (!callId) return;

  // Find the call log by vapiCallId
  const callLog = await prisma.vapiCallLog.findUnique({
    where: { vapiCallId: callId },
  });

  if (callLog) {
    await prisma.vapiCallLog.update({
      where: { id: callLog.id },
      data: {
        status: "CALLING",
        startedAt: new Date(),
      },
    });
  }
}

/**
 * Handle call ringing event
 */
async function handleCallRinging(event: VapiWebhookEvent) {
  const callId = event.call?.id;
  if (!callId) return;

  await prisma.vapiCallLog.updateMany({
    where: { vapiCallId: callId },
    data: { status: "CALLING" },
  });
}

/**
 * Handle call connected event
 */
async function handleCallConnected(event: VapiWebhookEvent) {
  const callId = event.call?.id;
  if (!callId) return;

  await prisma.vapiCallLog.updateMany({
    where: { vapiCallId: callId },
    data: { status: "CALLING" },
  });
}

/**
 * Handle call ended event
 */
async function handleCallEnded(event: VapiWebhookEvent) {
  const callId = event.call?.id;
  if (!callId) return;

  const endedReason = event.call?.endedReason;
  let status: VapiCallStatus = "COMPLETED";

  // Map ended reason to status
  switch (endedReason) {
    case "no-answer":
    case "voicemail":
      status = "NO_ANSWER";
      break;
    case "busy":
      status = "BUSY";
      break;
    case "failed":
    case "error":
      status = "FAILED";
      break;
    case "canceled":
      status = "CANCELLED";
      break;
    default:
      status = "COMPLETED";
  }

  // Calculate duration if we have timestamps
  let duration: number | undefined;
  if (event.call?.endedAt && event.call?.createdAt) {
    const endedAt = new Date(event.call.endedAt).getTime();
    const startedAt = new Date(event.call.createdAt).getTime();
    duration = Math.round((endedAt - startedAt) / 1000);
  }

  // Get transcript if available
  const transcript = event.call?.transcript;

  // Update call log
  await prisma.vapiCallLog.updateMany({
    where: { vapiCallId: callId },
    data: {
      status,
      endedAt: new Date(),
      duration,
      transcript: transcript || undefined,
    },
  });

  // Get call log details for cost tracking
  const callLog = await prisma.vapiCallLog.findUnique({
    where: { vapiCallId: callId },
    select: {
      id: true,
      callJobId: true,
      status: true,
      weddingEventId: true,
      guestId: true,
      duration: true,
    },
  });

  // Log voice call cost if we have duration and event details
  if (callLog && duration) {
    try {
      // Get ownerId from the wedding event
      const weddingEvent = await prisma.weddingEvent.findUnique({
        where: { id: callLog.weddingEventId },
        select: { ownerId: true },
      });

      if (weddingEvent) {
        await logVoiceCallCost(
          weddingEvent.ownerId,
          callLog.weddingEventId,
          callLog.guestId,
          duration,
          {
            vapiCallId: callId,
            status,
            endedReason,
          }
        );
      }
    } catch (error) {
      console.error("Error logging voice call cost:", error);
      // Don't fail the webhook if cost logging fails
    }
  }

  // Update job progress if this call is part of a job
  if (!callLog) return;

  if (callLog?.callJobId) {
    const isSuccess = status === "COMPLETED";

    await prisma.vapiCallJob.update({
      where: { id: callLog.callJobId },
      data: {
        processedCount: { increment: 1 },
        successCount: isSuccess ? { increment: 1 } : undefined,
        failedCount: !isSuccess ? { increment: 1 } : undefined,
      },
    });

    // Check if job is complete
    const job = await prisma.vapiCallJob.findUnique({
      where: { id: callLog.callJobId },
      select: { totalGuests: true, processedCount: true },
    });

    if (job && job.processedCount >= job.totalGuests) {
      await prisma.vapiCallJob.update({
        where: { id: callLog.callJobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    }
  }
}

/**
 * Handle transcript event (intermediate transcripts during call)
 */
async function handleTranscript(event: VapiWebhookEvent) {
  const callId = event.call?.id;
  if (!callId) return;

  // For now, we'll store the full transcript at the end of the call
  // Intermediate transcripts can be used for real-time features if needed
  const transcript = event.call?.transcript;

  if (transcript) {
    await prisma.vapiCallLog.updateMany({
      where: { vapiCallId: callId },
      data: { transcript },
    });
  }
}
