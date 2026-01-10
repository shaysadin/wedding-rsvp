"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { VapiClient } from "@/lib/vapi/client";
import { syncCallFromVapi, syncAllActiveCalls } from "@/lib/vapi/call-sync";
import { canMakeVoiceCalls, isVoiceCallsEnabled, getRemainingVoiceCalls, PLAN_LIMITS, getVoiceCallLimit, BUSINESS_VOICE_ADDON_CALLS } from "@/config/plans";
import { PlanTier } from "@prisma/client";
import { getEffectivePhoneNumberId } from "./phone-numbers";

// ============ Helper: Get Billing Period ============

/**
 * Get the current billing period start date for a user
 * If user has a Stripe subscription, calculates from stripeCurrentPeriodEnd
 * Otherwise uses the usageTracking periodStart or falls back to 30 days ago
 */
async function getBillingPeriodStart(userId: string): Promise<Date> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stripeCurrentPeriodEnd: true,
      usageTracking: { select: { periodStart: true } },
    },
  });

  if (!user) {
    // Default to 30 days ago if user not found
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return thirtyDaysAgo;
  }

  // If user has Stripe subscription, calculate period start from period end
  if (user.stripeCurrentPeriodEnd) {
    const periodEnd = new Date(user.stripeCurrentPeriodEnd);
    const periodStart = new Date(periodEnd);
    periodStart.setMonth(periodStart.getMonth() - 1); // Monthly billing
    return periodStart;
  }

  // Use usageTracking periodStart if available
  if (user.usageTracking?.periodStart) {
    return new Date(user.usageTracking.periodStart);
  }

  // Default to 30 days ago for free users
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return thirtyDaysAgo;
}

// ============ Helper: Get Actual Voice Call Count ============

/**
 * Get actual voice call count from VapiCallLog (source of truth)
 * Only counts calls within the current billing period
 */
async function getActualVoiceCallCount(userId: string): Promise<{
  callsMade: number;
  callsBonus: number;
}> {
  // Get billing period start
  const periodStart = await getBillingPeriodStart(userId);

  // Get user's events
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      weddingEvents: { select: { id: true } },
      usageTracking: { select: { voiceCallsBonus: true } },
    },
  });

  if (!user) {
    return { callsMade: 0, callsBonus: 0 };
  }

  const eventIds = user.weddingEvents.map(e => e.id);

  // Count actual calls from VapiCallLog within current billing period
  const callsMade = await prisma.vapiCallLog.count({
    where: {
      weddingEventId: { in: eventIds },
      status: { in: ["COMPLETED", "NO_ANSWER", "BUSY", "CALLING"] },
      createdAt: { gte: periodStart },
    },
  });

  return {
    callsMade,
    callsBonus: user.usageTracking?.voiceCallsBonus || 0,
  };
}

// ============ Single Call ============

/**
 * Initiate a single call to a guest
 */
export async function callGuest(guestId: string, eventId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Get the user's plan and voice add-on status from the database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true, voiceCallsAddOn: true },
    });

    if (!dbUser) {
      return { error: "User not found" };
    }

    // Check plan limits for voice calls
    const userPlan = dbUser.plan;
    const hasVoiceAddon = dbUser.voiceCallsAddOn || false;
    const planLimits = PLAN_LIMITS[userPlan];

    // Calculate effective voice call limit based on plan and add-on status
    // BUSINESS plan: 0 base, 2000 with add-on
    // Other plans: use base limit from plan config
    const effectiveVoiceCallLimit = userPlan === PlanTier.BUSINESS
      ? (hasVoiceAddon ? BUSINESS_VOICE_ADDON_CALLS : 0)
      : planLimits?.maxVoiceCalls ?? 0;

    // Debug logging
    console.log("[VOICE CALL CHECK]", {
      userId: user.id,
      plan: userPlan,
      hasVoiceAddon,
      baseLimit: planLimits?.maxVoiceCalls,
      effectiveLimit: effectiveVoiceCallLimit,
    });

    // Check if voice calls are enabled for this plan
    if (effectiveVoiceCallLimit === 0) {
      if (userPlan === PlanTier.BUSINESS && !hasVoiceAddon) {
        return { error: "VOICE_CALLS_NOT_AVAILABLE", message: "Voice calls require the voice add-on for your Business plan. Please enable it in your billing settings." };
      }
      return { error: "VOICE_CALLS_NOT_AVAILABLE", message: "Voice calls are not available on your plan. Please upgrade to use this feature." };
    }

    // Get actual voice call count from VapiCallLog (source of truth)
    const { callsMade: voiceCallsMade, callsBonus: voiceCallsBonus } = await getActualVoiceCallCount(user.id);
    const totalAllowed = effectiveVoiceCallLimit + voiceCallsBonus;
    const remaining = Math.max(0, totalAllowed - voiceCallsMade);

    // Debug logging
    console.log("[VOICE CALL DEBUG]", {
      userId: user.id,
      plan: userPlan,
      voiceCallsMade,
      voiceCallsBonus,
      effectiveLimit: effectiveVoiceCallLimit,
      totalAllowed,
      remaining,
    });

    // Check if user can make more calls
    if (voiceCallsMade >= totalAllowed) {
      return {
        error: "VOICE_CALL_LIMIT_REACHED",
        message: `You have reached your voice call limit. ${remaining} calls remaining.`,
        remaining,
      };
    }

    // Verify guest belongs to user's event
    const guest = await prisma.guest.findFirst({
      where: {
        id: guestId,
        weddingEventId: eventId,
        weddingEvent: { ownerId: user.id },
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        weddingEventId: true,
      },
    });

    if (!guest) {
      return { error: "Guest not found or unauthorized" };
    }

    if (!guest.phoneNumber) {
      return { error: "Guest has no phone number" };
    }

    // Get platform VAPI settings
    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings?.vapiEnabled || !settings.vapiApiKey) {
      return { error: "VAPI is not configured or enabled" };
    }

    if (!settings.vapiAssistantId) {
      return { error: "VAPI assistant not configured" };
    }

    // Get the effective phone number for this user (assigned or default)
    const phoneNumberResult = await getEffectivePhoneNumberId(user.id);
    if (!phoneNumberResult.success || !phoneNumberResult.vapiPhoneId) {
      return { error: phoneNumberResult.error || "No phone number configured for voice calls" };
    }

    const effectivePhoneNumberId = phoneNumberResult.vapiPhoneId;

    // Get event settings (for custom prompts if any)
    const eventSettings = await prisma.vapiEventSettings.findUnique({
      where: { weddingEventId: eventId },
    });

    if (eventSettings && !eventSettings.isEnabled) {
      return { error: "Voice agent is disabled for this event" };
    }

    // Get wedding details for the prompt
    const event = await prisma.weddingEvent.findUnique({
      where: { id: eventId },
      select: {
        title: true,
        dateTime: true,
        location: true,
        venue: true,
      },
    });

    // Create call log record
    const callLog = await prisma.vapiCallLog.create({
      data: {
        guestId: guest.id,
        weddingEventId: eventId,
        phoneNumber: guest.phoneNumber,
        status: "PENDING",
      },
    });

    // Initiate call via VAPI
    const client = new VapiClient(settings.vapiApiKey);

    // Format phone number to E.164 format
    const formattedPhone = formatPhoneToE164(guest.phoneNumber);
    if (!formattedPhone) {
      return { error: "Invalid phone number format. Must include country code (e.g., +972...)" };
    }

    // Get wedding details for variable injection
    const weddingDetailsText = event
      ? formatWeddingDetailsForPrompt(event)
      : "פרטי החתונה לא זמינים";

    try {
      const call = await client.createCall({
        phoneNumberId: effectivePhoneNumberId,
        assistantId: settings.vapiAssistantId,
        customerNumber: formattedPhone,
        customerName: guest.name,
        assistantOverrides: {
          // Inject variables into the assistant's prompt template
          variableValues: {
            guest_name: guest.name,
            wedding_details: weddingDetailsText,
          },
          // Metadata for our API tools to access during the call
          metadata: {
            eventId,
            guestId: guest.id,
          },
        },
      });

      // Update call log with VAPI call ID
      await prisma.vapiCallLog.update({
        where: { id: callLog.id },
        data: {
          vapiCallId: call.id,
          status: "CALLING",
        },
      });

      // Increment voice calls count in usage tracking
      await prisma.usageTracking.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          voiceCallsMade: 1,
          periodStart: new Date(),
        },
        update: {
          voiceCallsMade: { increment: 1 },
        },
      });

      return {
        success: true,
        callLogId: callLog.id,
        vapiCallId: call.id,
      };
    } catch (vapiError) {
      // Update call log with error
      await prisma.vapiCallLog.update({
        where: { id: callLog.id },
        data: { status: "FAILED" },
      });

      console.error("VAPI call error:", vapiError);
      return {
        error:
          vapiError instanceof Error
            ? vapiError.message
            : "Failed to initiate call",
      };
    }
  } catch (error) {
    console.error("Error calling guest:", error);
    return { error: "Failed to initiate call" };
  }
}

// ============ Bulk Calling ============

/**
 * Start a bulk calling job for multiple guests
 */
export async function startBulkCalling(
  eventId: string,
  guestIds: string[],
  options?: {
    scheduledFor?: Date;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Get the user's plan and voice add-on status from the database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true, voiceCallsAddOn: true },
    });

    if (!dbUser) {
      return { error: "User not found" };
    }

    // Check plan limits for voice calls
    const userPlan = dbUser.plan;
    const hasVoiceAddon = dbUser.voiceCallsAddOn || false;
    const planLimits = PLAN_LIMITS[userPlan];

    // Calculate effective voice call limit based on plan and add-on status
    const effectiveVoiceCallLimit = userPlan === PlanTier.BUSINESS
      ? (hasVoiceAddon ? BUSINESS_VOICE_ADDON_CALLS : 0)
      : planLimits?.maxVoiceCalls ?? 0;

    // Check if voice calls are enabled for this plan
    if (effectiveVoiceCallLimit === 0) {
      if (userPlan === PlanTier.BUSINESS && !hasVoiceAddon) {
        return { error: "VOICE_CALLS_NOT_AVAILABLE", message: "Voice calls require the voice add-on for your Business plan. Please enable it in your billing settings." };
      }
      return { error: "VOICE_CALLS_NOT_AVAILABLE", message: "Voice calls are not available on your plan. Please upgrade to use this feature." };
    }

    // Get actual voice call count from VapiCallLog (source of truth)
    const { callsMade: voiceCallsMade, callsBonus: voiceCallsBonus } = await getActualVoiceCallCount(user.id);
    const totalAllowed = effectiveVoiceCallLimit + voiceCallsBonus;
    const remaining = Math.max(0, totalAllowed - voiceCallsMade);

    // Check if user can make more calls (for the requested count)
    if (voiceCallsMade + guestIds.length > totalAllowed) {
      return {
        error: "VOICE_CALL_LIMIT_EXCEEDED",
        message: `You can only make ${remaining} more calls. Requested: ${guestIds.length}`,
        remaining,
        requested: guestIds.length,
      };
    }

    // Verify event belongs to user
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found or unauthorized" };
    }

    // Get VAPI settings
    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings?.vapiEnabled || !settings.vapiApiKey) {
      return { error: "VAPI is not configured or enabled" };
    }

    // Get or create event settings
    let eventSettings = await prisma.vapiEventSettings.findUnique({
      where: { weddingEventId: eventId },
    });

    if (!eventSettings) {
      eventSettings = await prisma.vapiEventSettings.create({
        data: { weddingEventId: eventId },
      });
    }

    if (!eventSettings.isEnabled) {
      return { error: "Voice agent is disabled for this event" };
    }

    // Verify guests exist and have phone numbers
    const guests = await prisma.guest.findMany({
      where: {
        id: { in: guestIds },
        weddingEventId: eventId,
        phoneNumber: { not: null },
      },
      select: { id: true, name: true, phoneNumber: true },
    });

    if (guests.length === 0) {
      return { error: "No valid guests with phone numbers found" };
    }

    // Create bulk job
    const job = await prisma.vapiCallJob.create({
      data: {
        weddingEventId: eventId,
        vapiSettingsId: eventSettings.id,
        createdBy: user.id,
        status: "PENDING",
        totalGuests: guests.length,
        scheduledFor: options?.scheduledFor,
      },
    });

    // Create call logs for each guest
    await prisma.vapiCallLog.createMany({
      data: guests.map((guest) => ({
        callJobId: job.id,
        guestId: guest.id,
        weddingEventId: eventId,
        phoneNumber: guest.phoneNumber!,
        status: "PENDING",
        scheduledAt: options?.scheduledFor,
      })),
    });

    // If not scheduled, start processing immediately
    if (!options?.scheduledFor) {
      // Start processing in background
      processCallJob(job.id).catch(console.error);
    }

    return {
      success: true,
      jobId: job.id,
      totalGuests: guests.length,
    };
  } catch (error) {
    console.error("Error starting bulk calling:", error);
    return { error: "Failed to start bulk calling" };
  }
}

// Concurrency settings for bulk calling
const BULK_CALL_CONCURRENCY = 3; // Max concurrent call initiations
const CALL_DELAY_MS = 1000; // Delay between batches

/**
 * Process a call job (runs in background) - OPTIMIZED with controlled concurrency
 */
async function processCallJob(jobId: string) {
  const job = await prisma.vapiCallJob.findUnique({
    where: { id: jobId },
    include: {
      callLogs: {
        where: { status: "PENDING" },
        include: { guest: { select: { id: true, name: true } } },
      },
      vapiSettings: {
        include: {
          weddingEvent: { select: { ownerId: true } },
        },
      },
    },
  });

  if (!job || job.status !== "PENDING") {
    return;
  }

  const userId = job.vapiSettings?.weddingEvent?.ownerId;
  if (!userId) {
    await prisma.vapiCallJob.update({
      where: { id: jobId },
      data: { status: "FAILED", errorMessage: "Could not determine user" },
    });
    return;
  }

  // Update job status
  await prisma.vapiCallJob.update({
    where: { id: jobId },
    data: { status: "PROCESSING", startedAt: new Date() },
  });

  // Get VAPI settings
  const settings = await prisma.messagingProviderSettings.findFirst({
    select: {
      vapiApiKey: true,
      vapiAssistantId: true,
    },
  });

  if (!settings?.vapiApiKey || !settings.vapiAssistantId) {
    await prisma.vapiCallJob.update({
      where: { id: jobId },
      data: { status: "FAILED", errorMessage: "VAPI not configured" },
    });
    return;
  }

  // Get the effective phone number for the user who owns this event
  const phoneNumberResult = await getEffectivePhoneNumberId(userId);
  if (!phoneNumberResult.success || !phoneNumberResult.vapiPhoneId) {
    await prisma.vapiCallJob.update({
      where: { id: jobId },
      data: { status: "FAILED", errorMessage: phoneNumberResult.error || "No phone number configured" },
    });
    return;
  }

  const effectivePhoneNumberId = phoneNumberResult.vapiPhoneId;

  // Get event details once (not per call)
  const event = await prisma.weddingEvent.findUnique({
    where: { id: job.weddingEventId },
    select: { title: true, dateTime: true, location: true, venue: true },
  });

  const client = new VapiClient(settings.vapiApiKey);
  const weddingDetailsText = event
    ? formatWeddingDetailsForPrompt(event)
    : "פרטי החתונה לא זמינים";

  // Process calls in batches with controlled concurrency
  for (let i = 0; i < job.callLogs.length; i += BULK_CALL_CONCURRENCY) {
    const batch = job.callLogs.slice(i, i + BULK_CALL_CONCURRENCY);

    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (callLog) => {
        const formattedPhone = formatPhoneToE164(callLog.phoneNumber);
        if (!formattedPhone) {
          throw new Error("Invalid phone number format");
        }

        const call = await client.createCall({
          phoneNumberId: effectivePhoneNumberId,
          assistantId: settings.vapiAssistantId!,
          customerNumber: formattedPhone,
          customerName: callLog.guest.name,
          assistantOverrides: {
            variableValues: {
              guest_name: callLog.guest.name,
              wedding_details: weddingDetailsText,
            },
            metadata: {
              eventId: job.weddingEventId,
              guestId: callLog.guestId,
            },
          },
        });

        return { callLogId: callLog.id, vapiCallId: call.id };
      })
    );

    // Process results and update database in batch
    const updates: Array<{ id: string; vapiCallId?: string; status: string }> = [];
    let successCount = 0;
    let failCount = 0;

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const callLog = batch[j];

      if (result.status === "fulfilled") {
        updates.push({
          id: callLog.id,
          vapiCallId: result.value.vapiCallId,
          status: "CALLING",
        });
        successCount++;
      } else {
        console.error(`Error calling guest ${callLog.guestId}:`, result.reason);
        updates.push({ id: callLog.id, status: "FAILED" });
        failCount++;
      }
    }

    // Batch update call logs
    await Promise.all(
      updates.map((update) =>
        prisma.vapiCallLog.update({
          where: { id: update.id },
          data: {
            status: update.status as any,
            vapiCallId: update.vapiCallId,
            startedAt: update.status === "CALLING" ? new Date() : undefined,
          },
        })
      )
    );

    // Update job progress
    await prisma.vapiCallJob.update({
      where: { id: jobId },
      data: {
        processedCount: { increment: batch.length },
        successCount: { increment: successCount },
        failedCount: { increment: failCount },
      },
    });

    // Increment voice calls count in usage tracking for successful calls
    if (successCount > 0) {
      await prisma.usageTracking.upsert({
        where: { userId },
        create: {
          userId,
          voiceCallsMade: successCount,
          periodStart: new Date(),
        },
        update: {
          voiceCallsMade: { increment: successCount },
        },
      });
    }

    // Small delay between batches to avoid overwhelming VAPI
    if (i + BULK_CALL_CONCURRENCY < job.callLogs.length) {
      await new Promise((resolve) => setTimeout(resolve, CALL_DELAY_MS));
    }
  }

  // Mark job as completed
  await prisma.vapiCallJob.update({
    where: { id: jobId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

// ============ Job Management ============

/**
 * Get call job status
 */
export async function getCallJobStatus(jobId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const job = await prisma.vapiCallJob.findFirst({
      where: {
        id: jobId,
        vapiSettings: { weddingEvent: { ownerId: user.id } },
      },
      include: {
        callLogs: {
          select: {
            id: true,
            status: true,
            guestId: true,
            rsvpUpdated: true,
            rsvpStatus: true,
            duration: true,
            guest: { select: { name: true } },
          },
        },
      },
    });

    if (!job) {
      return { error: "Job not found" };
    }

    return {
      success: true,
      job: {
        id: job.id,
        status: job.status,
        totalGuests: job.totalGuests,
        processedCount: job.processedCount,
        successCount: job.successCount,
        failedCount: job.failedCount,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        callLogs: job.callLogs,
      },
    };
  } catch (error) {
    console.error("Error getting job status:", error);
    return { error: "Failed to get job status" };
  }
}

/**
 * Cancel a call job
 */
export async function cancelCallJob(jobId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const job = await prisma.vapiCallJob.findFirst({
      where: {
        id: jobId,
        vapiSettings: { weddingEvent: { ownerId: user.id } },
      },
    });

    if (!job) {
      return { error: "Job not found" };
    }

    if (job.status === "COMPLETED" || job.status === "CANCELLED") {
      return { error: "Job is already completed or cancelled" };
    }

    // Cancel pending calls
    await prisma.vapiCallLog.updateMany({
      where: { callJobId: jobId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    // Update job status
    await prisma.vapiCallJob.update({
      where: { id: jobId },
      data: { status: "CANCELLED", completedAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error("Error cancelling job:", error);
    return { error: "Failed to cancel job" };
  }
}

// ============ Call History ============

/**
 * Get call history for an event
 */
export async function getCallHistory(
  eventId: string,
  options?: { limit?: number; offset?: number }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify event belongs to user
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const callLogs = await prisma.vapiCallLog.findMany({
      where: { weddingEventId: eventId },
      include: {
        guest: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    const total = await prisma.vapiCallLog.count({
      where: { weddingEventId: eventId },
    });

    return {
      success: true,
      callLogs,
      total,
    };
  } catch (error) {
    console.error("Error getting call history:", error);
    return { error: "Failed to get call history" };
  }
}

// ============ Helper Functions ============

function formatWeddingDetailsForPrompt(event: {
  title: string;
  dateTime: Date;
  location: string;
  venue?: string | null;
}): string {
  const date = event.dateTime.toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = event.dateTime.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = [
    `שם האירוע: ${event.title}`,
    `תאריך: ${date}`,
    `שעה: ${time}`,
    `מיקום: ${event.location}`,
  ];

  if (event.venue) {
    parts.push(`אולם: ${event.venue}`);
  }

  return parts.join("\n");
}

/**
 * Format phone number to E.164 format
 * Handles Israeli numbers and other international formats
 */
function formatPhoneToE164(phone: string): string | null {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // If already starts with +, validate it has enough digits
  if (cleaned.startsWith("+")) {
    // Minimum E.164 is +X (1) + subscriber (at least 4 digits) = 5 chars
    // Maximum is +XXX + 14 digits = 17 chars
    if (cleaned.length >= 8 && cleaned.length <= 16) {
      return cleaned;
    }
    return null;
  }

  // Handle Israeli numbers
  if (cleaned.startsWith("972")) {
    return "+" + cleaned;
  }

  // Handle Israeli local format (starts with 0)
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    // Israeli mobile: 05X-XXX-XXXX -> +972-5X-XXX-XXXX
    return "+972" + cleaned.substring(1);
  }

  // Handle numbers that might be missing the +
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    // Assume it needs a + prefix if it looks like an international number
    return "+" + cleaned;
  }

  return null;
}

// ============ Guest Retrieval ============

/**
 * Get guests for voice calling
 */
export async function getGuestsForCalling(eventId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify event belongs to user
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found or unauthorized" };
    }

    // Get all guests with their RSVP status
    const guests = await prisma.guest.findMany({
      where: { weddingEventId: eventId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        rsvp: {
          select: {
            status: true,
            guestCount: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      guests,
    };
  } catch (error) {
    console.error("Error getting guests for calling:", error);
    return { error: "Failed to get guests" };
  }
}

// ============ Call Sync ============

/**
 * Sync a single call's status from VAPI
 */
export async function syncCall(callLogId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Get call log and verify ownership
    const callLog = await prisma.vapiCallLog.findFirst({
      where: {
        id: callLogId,
        guest: { weddingEvent: { ownerId: user.id } },
      },
    });

    if (!callLog || !callLog.vapiCallId) {
      return { error: "Call not found" };
    }

    const result = await syncCallFromVapi(callLog.vapiCallId);

    if (result.success) {
      return { success: true, callLog: result.callLog };
    }

    return { error: result.error };
  } catch (error) {
    console.error("Error syncing call:", error);
    return { error: "Failed to sync call" };
  }
}

/**
 * Sync all active calls for an event
 */
export async function syncEventCalls(eventId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      select: { id: true },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const result = await syncAllActiveCalls(eventId);

    return {
      success: true,
      synced: result.synced,
      errors: result.errors,
      skipped: result.skipped,
      activeCalls: result.activeCalls,
    };
  } catch (error) {
    console.error("Error syncing event calls:", error);
    return { error: "Failed to sync calls" };
  }
}

/**
 * Get call details including transcript
 */
export async function getCallDetails(callLogId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const callLog = await prisma.vapiCallLog.findFirst({
      where: {
        id: callLogId,
        guest: { weddingEvent: { ownerId: user.id } },
      },
      include: {
        guest: { select: { id: true, name: true, phoneNumber: true } },
      },
    });

    if (!callLog) {
      return { error: "Call not found" };
    }

    // If call is still active and has a vapiCallId, sync first
    if (callLog.vapiCallId && (callLog.status === "PENDING" || callLog.status === "CALLING")) {
      await syncCallFromVapi(callLog.vapiCallId);

      // Re-fetch updated data
      const updatedLog = await prisma.vapiCallLog.findUnique({
        where: { id: callLogId },
        include: {
          guest: { select: { id: true, name: true, phoneNumber: true } },
        },
      });

      return { success: true, callLog: updatedLog };
    }

    return { success: true, callLog };
  } catch (error) {
    console.error("Error getting call details:", error);
    return { error: "Failed to get call details" };
  }
}
