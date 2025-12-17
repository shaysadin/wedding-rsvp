"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// ============ Event Settings ============

export interface VapiEventSettingsInput {
  isEnabled?: boolean;
  canUpdateRsvp?: boolean;
}

/**
 * Get VAPI settings for a specific event
 */
export async function getVapiEventSettings(eventId: string) {
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

    // Get or create event settings
    let settings = await prisma.vapiEventSettings.findUnique({
      where: { weddingEventId: eventId },
      include: {
        embeddings: {
          select: {
            id: true,
            contentType: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!settings) {
      settings = await prisma.vapiEventSettings.create({
        data: { weddingEventId: eventId },
        include: {
          embeddings: {
            select: {
              id: true,
              contentType: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    }

    // Get platform settings to check if VAPI is enabled
    const platformSettings = await prisma.messagingProviderSettings.findFirst();

    return {
      success: true,
      settings: {
        id: settings.id,
        weddingEventId: settings.weddingEventId,
        isEnabled: settings.isEnabled,
        canUpdateRsvp: settings.canUpdateRsvp,
        lastSyncAt: settings.lastSyncAt,
        syncStatus: settings.syncStatus,
        embeddings: settings.embeddings,
      },
      vapiEnabled: platformSettings?.vapiEnabled || false,
    };
  } catch (error) {
    console.error("Error getting VAPI event settings:", error);
    return { error: "Failed to get settings" };
  }
}

/**
 * Update VAPI settings for a specific event
 */
export async function updateVapiEventSettings(
  eventId: string,
  input: VapiEventSettingsInput
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
      return { error: "Event not found or unauthorized" };
    }

    // Upsert settings
    const settings = await prisma.vapiEventSettings.upsert({
      where: { weddingEventId: eventId },
      create: {
        weddingEventId: eventId,
        isEnabled: input.isEnabled ?? true,
        canUpdateRsvp: input.canUpdateRsvp ?? true,
      },
      update: {
        isEnabled: input.isEnabled,
        canUpdateRsvp: input.canUpdateRsvp,
      },
    });

    return { success: true, settings };
  } catch (error) {
    console.error("Error updating VAPI event settings:", error);
    return { error: "Failed to update settings" };
  }
}

/**
 * Toggle voice agent for an event
 */
export async function toggleVapiEventEnabled(eventId: string, enabled: boolean) {
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

    await prisma.vapiEventSettings.upsert({
      where: { weddingEventId: eventId },
      create: {
        weddingEventId: eventId,
        isEnabled: enabled,
      },
      update: {
        isEnabled: enabled,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error toggling VAPI event:", error);
    return { error: "Failed to toggle voice agent" };
  }
}

/**
 * Get voice agent availability status for an event
 */
export async function getVoiceAgentStatus(eventId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify event belongs to user
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      select: { id: true, title: true },
    });

    if (!event) {
      return { error: "Event not found or unauthorized" };
    }

    // Check platform VAPI settings
    const platformSettings = await prisma.messagingProviderSettings.findFirst();
    const platformEnabled = platformSettings?.vapiEnabled &&
                           !!platformSettings.vapiApiKey &&
                           !!platformSettings.vapiPhoneNumberId &&
                           !!platformSettings.vapiAssistantId;

    // Check event settings
    const eventSettings = await prisma.vapiEventSettings.findUnique({
      where: { weddingEventId: eventId },
    });

    // Get call statistics
    const callStats = await prisma.vapiCallLog.groupBy({
      by: ["status"],
      where: { weddingEventId: eventId },
      _count: true,
    });

    const stats = {
      total: callStats.reduce((sum, s) => sum + s._count, 0),
      completed: callStats.find((s) => s.status === "COMPLETED")?._count || 0,
      failed: callStats.find((s) => s.status === "FAILED")?._count || 0,
      noAnswer: callStats.find((s) => s.status === "NO_ANSWER")?._count || 0,
      pending: callStats.find((s) => s.status === "PENDING")?._count || 0,
      calling: callStats.find((s) => s.status === "CALLING")?._count || 0,
    };

    // Get active jobs
    const activeJobs = await prisma.vapiCallJob.findMany({
      where: {
        weddingEventId: eventId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      select: {
        id: true,
        status: true,
        totalGuests: true,
        processedCount: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      status: {
        platformEnabled,
        eventEnabled: eventSettings?.isEnabled ?? true,
        isConfigured: platformEnabled,
        lastSyncAt: eventSettings?.lastSyncAt,
        syncStatus: eventSettings?.syncStatus,
        callStats: stats,
        activeJobs,
      },
    };
  } catch (error) {
    console.error("Error getting voice agent status:", error);
    return { error: "Failed to get status" };
  }
}
