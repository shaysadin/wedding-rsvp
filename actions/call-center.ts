"use server";

/**
 * Call Center Server Actions
 *
 * Handles manual call center operations:
 * - Initiating calls
 * - Updating call notes
 * - Updating RSVP status from calls
 * - Fetching call history
 */

import { revalidatePath } from "next/cache";
import { ManualCallStatus, RsvpStatus } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { canAccessEvent } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatToE164 } from "@/lib/notifications/phone-formatter";

interface InitiateCallInput {
  eventId: string;
  guestId: string;
  locale: string;
}

interface UpdateCallNotesInput {
  callLogId: string;
  notes: string;
  eventId: string;
  locale: string;
}

interface UpdateRsvpFromCallInput {
  callLogId?: string;
  guestId: string;
  newRsvpStatus: RsvpStatus;
  guestCount?: number;
  eventId: string;
  locale: string;
}

/**
 * Initiate a call to a guest
 * Creates a ManualCallLog record
 */
export async function initiateCall(input: InitiateCallInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const { eventId, guestId, locale } = input;

    // Check access
    const hasAccess = await canAccessEvent(eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "Forbidden" };
    }

    // Get guest with phone number
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { weddingEvent: true },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    if (!guest.phoneNumber) {
      return { error: "Guest has no phone number" };
    }

    // Validate event ownership
    if (guest.weddingEventId !== eventId) {
      return { error: "Guest does not belong to this event" };
    }

    // Format phone number to E.164
    const formattedPhone = formatToE164(guest.phoneNumber);
    if (!formattedPhone) {
      return { error: "Invalid phone number format" };
    }

    // Create call log
    const callLog = await prisma.manualCallLog.create({
      data: {
        weddingEventId: eventId,
        guestId: guestId,
        operatorId: user.id,
        phoneNumber: formattedPhone,
        status: ManualCallStatus.INITIATED,
        direction: "outbound",
      },
    });

    revalidatePath(`/${locale}/events/${eventId}/call-center`);

    return {
      success: true,
      callLog: {
        id: callLog.id,
        guestId: callLog.guestId,
        phoneNumber: callLog.phoneNumber,
        status: callLog.status,
      },
    };
  } catch (error) {
    console.error("Error initiating call:", error);
    return { error: "Failed to initiate call" };
  }
}

/**
 * Update call log with Twilio Call SID after connection
 */
export async function updateCallSid(callLogId: string, twilioCallSid: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const callLog = await prisma.manualCallLog.findUnique({
      where: { id: callLogId },
    });

    if (!callLog) {
      return { error: "Call log not found" };
    }

    // Verify user is the operator
    if (callLog.operatorId !== user.id) {
      return { error: "Forbidden" };
    }

    await prisma.manualCallLog.update({
      where: { id: callLogId },
      data: { twilioCallSid },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating call SID:", error);
    return { error: "Failed to update call SID" };
  }
}

/**
 * Update call notes
 */
export async function updateCallNotes(input: UpdateCallNotesInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const { callLogId, notes, eventId, locale } = input;

    const callLog = await prisma.manualCallLog.findUnique({
      where: { id: callLogId },
    });

    if (!callLog) {
      return { error: "Call log not found" };
    }

    // Verify user is the operator
    if (callLog.operatorId !== user.id) {
      return { error: "Forbidden" };
    }

    // Check event access (require EDITOR role for modifying data)
    const hasAccess = await canAccessEvent(eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "Forbidden" };
    }

    await prisma.manualCallLog.update({
      where: { id: callLogId },
      data: { notes },
    });

    revalidatePath(`/${locale}/events/${eventId}/call-center`);

    return { success: true };
  } catch (error) {
    console.error("Error updating call notes:", error);
    return { error: "Failed to update call notes" };
  }
}

/**
 * Update guest RSVP status from call center (with or without active call)
 */
export async function updateRsvpFromCall(input: UpdateRsvpFromCallInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const { callLogId, guestId, newRsvpStatus, guestCount, eventId, locale } = input;

    // Check access
    const hasAccess = await canAccessEvent(eventId, user.id, "EDITOR");
    if (!hasAccess) {
      return { error: "Forbidden" };
    }

    // If call log is provided, verify access to it
    if (callLogId) {
      const callLog = await prisma.manualCallLog.findUnique({
        where: { id: callLogId },
      });

      if (!callLog) {
        return { error: "Call log not found" };
      }

      // Verify user is the operator
      if (callLog.operatorId !== user.id) {
        return { error: "Forbidden" };
      }
    }

    // Update or create RSVP
    await prisma.guestRsvp.upsert({
      where: { guestId },
      create: {
        guestId,
        status: newRsvpStatus,
        guestCount: guestCount || 1,
      },
      update: {
        status: newRsvpStatus,
        guestCount: guestCount,
      },
    });

    // Mark call log as having updated RSVP (only if callLogId provided)
    if (callLogId) {
      await prisma.manualCallLog.update({
        where: { id: callLogId },
        data: {
          rsvpUpdated: true,
          newRsvpStatus: newRsvpStatus,
        },
      });
    }

    revalidatePath(`/${locale}/events/${eventId}/call-center`);
    revalidatePath(`/${locale}/events/${eventId}/guests`);

    return { success: true };
  } catch (error) {
    console.error("Error updating RSVP from call:", error);
    return { error: "Failed to update RSVP" };
  }
}

/**
 * Get call history for an event
 */
export async function getCallHistory(eventId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Check access
    const hasAccess = await canAccessEvent(eventId, user.id);
    if (!hasAccess) {
      return { error: "Forbidden" };
    }

    const calls = await prisma.manualCallLog.findMany({
      where: { weddingEventId: eventId },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
        operator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        initiatedAt: "desc",
      },
      take: 100, // Limit to last 100 calls
    });

    // Serialize Date objects to strings for client component
    const serializedCalls = calls.map((call) => ({
      ...call,
      initiatedAt: call.initiatedAt.toISOString(),
      connectedAt: call.connectedAt?.toISOString() || null,
      endedAt: call.endedAt?.toISOString() || null,
    }));

    return { success: true, calls: serializedCalls };
  } catch (error) {
    console.error("Error fetching call history:", error);
    return { error: "Failed to fetch call history" };
  }
}

/**
 * Get guests for call center (with filter options)
 */
export async function getCallCenterGuests(eventId: string, filters?: {
  search?: string;
  rsvpStatus?: RsvpStatus;
  side?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Check access
    const hasAccess = await canAccessEvent(eventId, user.id);
    if (!hasAccess) {
      return { error: "Forbidden" };
    }

    const where: any = {
      weddingEventId: eventId,
    };

    // Apply filters
    if (filters?.search) {
      where.name = {
        contains: filters.search,
        mode: "insensitive",
      };
    }

    if (filters?.side) {
      where.side = filters.side;
    }

    if (filters?.rsvpStatus) {
      where.rsvp = {
        status: filters.rsvpStatus,
      };
    }

    const guests = await prisma.guest.findMany({
      where,
      include: {
        rsvp: true,
        manualCallLogs: {
          orderBy: {
            initiatedAt: "desc",
          },
          take: 1, // Get most recent call
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return { success: true, guests };
  } catch (error) {
    console.error("Error fetching call center guests:", error);
    return { error: "Failed to fetch guests" };
  }
}
