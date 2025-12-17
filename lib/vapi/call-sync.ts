/**
 * VAPI Call Sync Service - Optimized Version
 * Handles syncing call data from VAPI with minimal API calls and database operations
 */

import { prisma } from "@/lib/db";
import { getVapiClient } from "./client";
import type { VapiCall, VapiCallStatus } from "./types";

// Cache for recent syncs to avoid duplicate API calls
const syncCache = new Map<string, { timestamp: number; status: string }>();
const SYNC_CACHE_TTL = 5000; // 5 seconds - don't re-sync same call within this window

/**
 * Check if a call needs syncing based on cache
 */
function needsSync(vapiCallId: string, currentStatus: string): boolean {
  const cached = syncCache.get(vapiCallId);
  if (!cached) return true;

  // If cached recently and status hasn't changed to a final state, skip
  const isRecent = Date.now() - cached.timestamp < SYNC_CACHE_TTL;
  const isFinalStatus = ["COMPLETED", "FAILED", "NO_ANSWER", "BUSY", "CANCELLED"].includes(cached.status);

  // Don't re-sync if recently synced to a final status
  if (isRecent && isFinalStatus) return false;

  // Don't re-sync if recently synced and current status matches
  if (isRecent && cached.status === currentStatus) return false;

  return true;
}

/**
 * Update sync cache
 */
function updateCache(vapiCallId: string, status: string): void {
  syncCache.set(vapiCallId, { timestamp: Date.now(), status });

  // Cleanup old cache entries periodically
  if (syncCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of syncCache.entries()) {
      if (now - value.timestamp > 60000) { // 1 minute
        syncCache.delete(key);
      }
    }
  }
}

/**
 * Sync a single call's status from VAPI (with caching)
 */
export async function syncCallFromVapi(vapiCallId: string, forceSync = false): Promise<{
  success: boolean;
  callLog?: any;
  error?: string;
  skipped?: boolean;
}> {
  try {
    // Check cache first
    const callLog = await prisma.vapiCallLog.findUnique({
      where: { vapiCallId },
      select: { id: true, status: true, guestId: true, callJobId: true, rsvpUpdated: true },
    });

    if (!callLog) {
      return { success: false, error: "Call log not found" };
    }

    // Skip if already in final state
    if (["COMPLETED", "FAILED", "NO_ANSWER", "BUSY", "CANCELLED"].includes(callLog.status)) {
      return { success: true, skipped: true };
    }

    // Check cache unless force sync
    if (!forceSync && !needsSync(vapiCallId, callLog.status)) {
      return { success: true, skipped: true };
    }

    const client = await getVapiClient();
    if (!client) {
      return { success: false, error: "VAPI not configured" };
    }

    // Fetch call from VAPI
    const vapiCall = await client.getCall(vapiCallId);

    // Map VAPI status to our status
    const status = mapVapiStatus(vapiCall.status, vapiCall.endedReason);

    // Update cache
    updateCache(vapiCallId, status);

    // Get transcript from artifact or direct field
    const transcript = vapiCall.artifact?.transcript || vapiCall.transcript;

    // Calculate duration
    let duration: number | undefined;
    if (vapiCall.endedAt && vapiCall.startedAt) {
      duration = Math.round(
        (new Date(vapiCall.endedAt).getTime() - new Date(vapiCall.startedAt).getTime()) / 1000
      );
    }

    // Single update query
    const updatedLog = await prisma.vapiCallLog.update({
      where: { id: callLog.id },
      data: {
        status,
        duration,
        transcript,
        startedAt: vapiCall.startedAt ? new Date(vapiCall.startedAt) : undefined,
        endedAt: vapiCall.endedAt ? new Date(vapiCall.endedAt) : undefined,
      },
    });

    // If call is completed and RSVP wasn't updated via tool, try to extract from transcript
    if (status === "COMPLETED" && !callLog.rsvpUpdated && transcript) {
      await extractRsvpFromTranscript(callLog.id, callLog.guestId, transcript);
    }

    // Update job progress if part of a bulk job and call reached final state
    if (callLog.callJobId && isFinalStatus(status)) {
      await updateJobProgress(callLog.callJobId, status);
    }

    return { success: true, callLog: updatedLog };
  } catch (error) {
    console.error("Error syncing call from VAPI:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Sync all active calls for an event - OPTIMIZED
 * Only syncs calls that are in PENDING or CALLING state
 */
export async function syncAllActiveCalls(eventId?: string): Promise<{
  synced: number;
  errors: number;
  skipped: number;
  activeCalls: Array<{
    id: string;
    status: string;
    guestName: string;
    phoneNumber: string;
    startedAt: Date | null;
  }>;
}> {
  try {
    // Find only active calls that need syncing
    const whereClause: any = {
      status: { in: ["PENDING", "CALLING"] },
      vapiCallId: { not: null },
    };

    if (eventId) {
      whereClause.weddingEventId = eventId;
    }

    const activeCalls = await prisma.vapiCallLog.findMany({
      where: whereClause,
      select: {
        id: true,
        vapiCallId: true,
        status: true,
        startedAt: true,
        phoneNumber: true,
        guest: { select: { name: true } },
      },
      take: 50, // Limit to prevent too many API calls
    });

    let synced = 0;
    let errors = 0;
    let skipped = 0;

    // Process calls in parallel with concurrency limit
    const CONCURRENCY = 5;
    for (let i = 0; i < activeCalls.length; i += CONCURRENCY) {
      const batch = activeCalls.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(call => call.vapiCallId ? syncCallFromVapi(call.vapiCallId) : Promise.resolve({ success: true, skipped: true }))
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          if (result.value.skipped) skipped++;
          else if (result.value.success) synced++;
          else errors++;
        } else {
          errors++;
        }
      }
    }

    // Fetch updated active calls
    const updatedActiveCalls = await prisma.vapiCallLog.findMany({
      where: {
        ...whereClause,
        status: { in: ["PENDING", "CALLING"] },
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        phoneNumber: true,
        guest: { select: { name: true } },
      },
    });

    return {
      synced,
      errors,
      skipped,
      activeCalls: updatedActiveCalls.map(c => ({
        id: c.id,
        status: c.status,
        guestName: c.guest.name,
        phoneNumber: c.phoneNumber,
        startedAt: c.startedAt,
      })),
    };
  } catch (error) {
    console.error("Error syncing active calls:", error);
    return { synced: 0, errors: 1, skipped: 0, activeCalls: [] };
  }
}

/**
 * Quick check for active calls without syncing - for initial load
 */
export async function getActiveCallsQuick(eventId: string): Promise<{
  activeCalls: Array<{
    id: string;
    status: string;
    guestName: string;
    phoneNumber: string;
    startedAt: Date | null;
  }>;
  hasActiveCalls: boolean;
}> {
  const activeCalls = await prisma.vapiCallLog.findMany({
    where: {
      weddingEventId: eventId,
      status: { in: ["PENDING", "CALLING"] },
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      phoneNumber: true,
      guest: { select: { name: true } },
    },
    take: 20,
  });

  return {
    activeCalls: activeCalls.map(c => ({
      id: c.id,
      status: c.status,
      guestName: c.guest.name,
      phoneNumber: c.phoneNumber,
      startedAt: c.startedAt,
    })),
    hasActiveCalls: activeCalls.length > 0,
  };
}

/**
 * Check if status is final
 */
function isFinalStatus(status: string): boolean {
  return ["COMPLETED", "FAILED", "NO_ANSWER", "BUSY", "CANCELLED"].includes(status);
}

/**
 * Extract RSVP information from call transcript - OPTIMIZED
 */
async function extractRsvpFromTranscript(
  callLogId: string,
  guestId: string,
  transcript: string
): Promise<void> {
  try {
    // Hebrew patterns for RSVP detection
    const attendingPatterns = [
      /נגיע/i, /מגיע/i, /מגיעים/i, /נהיה שם/i, /נשמח להגיע/i, /בטח/i,
    ];

    const decliningPatterns = [
      /לא נוכל/i, /לא נגיע/i, /לא מגיע/i, /לצערי/i, /לא אוכל/i,
    ];

    let isAttending: boolean | null = null;
    let guestCount = 1;

    // Check for attendance
    for (const pattern of attendingPatterns) {
      if (pattern.test(transcript)) {
        isAttending = true;
        break;
      }
    }

    if (isAttending === null) {
      for (const pattern of decliningPatterns) {
        if (pattern.test(transcript)) {
          isAttending = false;
          break;
        }
      }
    }

    if (isAttending === null) return;

    // Extract guest count
    if (isAttending) {
      const countPatterns = [
        { pattern: /שניים|שני|2/, count: 2 },
        { pattern: /שלושה|שלוש|3/, count: 3 },
        { pattern: /ארבעה|ארבע|4/, count: 4 },
        { pattern: /חמישה|חמש|5/, count: 5 },
        { pattern: /לבד|בלבד|אחד|1/, count: 1 },
      ];

      for (const { pattern, count } of countPatterns) {
        if (pattern.test(transcript)) {
          guestCount = count;
          break;
        }
      }
    }

    // Single transaction for both updates
    const rsvpStatus = isAttending ? "ACCEPTED" : "DECLINED";

    await prisma.$transaction([
      prisma.guestRsvp.upsert({
        where: { guestId },
        create: {
          guestId,
          status: rsvpStatus,
          guestCount: isAttending ? guestCount : 0,
          respondedAt: new Date(),
        },
        update: {
          status: rsvpStatus,
          guestCount: isAttending ? guestCount : 0,
          respondedAt: new Date(),
        },
      }),
      prisma.vapiCallLog.update({
        where: { id: callLogId },
        data: {
          rsvpUpdated: true,
          rsvpStatus,
          guestCount: isAttending ? guestCount : 0,
        },
      }),
    ]);

    console.log(`Extracted RSVP: ${rsvpStatus}, count: ${guestCount}`);
  } catch (error) {
    console.error("Error extracting RSVP from transcript:", error);
  }
}

/**
 * Map VAPI call status to our status enum
 */
function mapVapiStatus(status: string, endedReason?: string): VapiCallStatus {
  if (status === "ended" && endedReason) {
    switch (endedReason) {
      case "customer-did-not-answer":
      case "customer-did-not-pick-up":
      case "no-answer":
        return "NO_ANSWER";
      case "customer-busy":
      case "busy":
        return "BUSY";
      case "error":
      case "failed":
      case "pipeline-error-openai":
      case "pipeline-error-azure":
        return "FAILED";
      default:
        return "COMPLETED";
    }
  }

  switch (status) {
    case "queued":
      return "PENDING";
    case "ringing":
    case "in-progress":
      return "CALLING";
    case "ended":
      return "COMPLETED";
    default:
      return "PENDING";
  }
}

/**
 * Update job progress - OPTIMIZED with single query
 */
async function updateJobProgress(jobId: string, status: VapiCallStatus): Promise<void> {
  try {
    const isSuccess = status === "COMPLETED";

    // Single query to update and check completion
    const job = await prisma.vapiCallJob.update({
      where: { id: jobId },
      data: {
        processedCount: { increment: 1 },
        successCount: isSuccess ? { increment: 1 } : undefined,
        failedCount: !isSuccess ? { increment: 1 } : undefined,
      },
      select: { totalGuests: true, processedCount: true },
    });

    // Check if job is complete
    if (job.processedCount >= job.totalGuests) {
      await prisma.vapiCallJob.update({
        where: { id: jobId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }
  } catch (error) {
    console.error("Error updating job progress:", error);
  }
}
