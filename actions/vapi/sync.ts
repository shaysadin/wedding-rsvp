"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// ============ Sync Actions ============

/**
 * Sync wedding data to VAPI embeddings
 * This creates/updates structured data that the voice agent can query during calls
 */
export async function syncWeddingDataToVapi(eventId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify event belongs to user
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      include: {
        guests: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
            rsvp: {
              select: {
                status: true,
                guestCount: true,
                respondedAt: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return { error: "Event not found or unauthorized" };
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

    // Update sync status to syncing
    await prisma.vapiEventSettings.update({
      where: { id: eventSettings.id },
      data: { syncStatus: "syncing" },
    });

    try {
      // 1. Sync Wedding Details
      const weddingDetails = {
        title: event.title,
        date: event.dateTime.toISOString(),
        location: event.location,
        venue: event.venue || undefined,
        notes: event.notes || undefined,
      };

      await upsertEmbedding(
        eventSettings.id,
        "wedding_details",
        JSON.stringify(weddingDetails)
      );

      // 2. Sync Guest Summary (for agent context)
      const guestsWithPhone = event.guests.filter((g) => g.phoneNumber);
      const guestSummary = {
        totalGuests: event.guests.length,
        guestsWithPhone: guestsWithPhone.length,
        guestNames: event.guests.map((g) => g.name),
        rsvpStats: {
          accepted: event.guests.filter((g) => g.rsvp?.status === "ACCEPTED").length,
          declined: event.guests.filter((g) => g.rsvp?.status === "DECLINED").length,
          pending: event.guests.filter((g) => !g.rsvp || g.rsvp.status === "PENDING").length,
        },
      };

      await upsertEmbedding(
        eventSettings.id,
        "guest_summary",
        JSON.stringify(guestSummary)
      );

      // 3. Sync FAQ/Additional Info (if available)
      const faqContent = {
        dresscode: event.notes?.includes("dress") ? "Formal" : "Not specified",
        parking: "Available at venue",
        contact: "Contact the couple for more details",
      };

      await upsertEmbedding(
        eventSettings.id,
        "faq",
        JSON.stringify(faqContent)
      );

      // Update sync status to completed
      await prisma.vapiEventSettings.update({
        where: { id: eventSettings.id },
        data: {
          lastSyncAt: new Date(),
          syncStatus: "synced",
        },
      });

      return {
        success: true,
        syncedAt: new Date(),
        stats: {
          guestsWithPhone: guestsWithPhone.length,
          totalGuests: event.guests.length,
          embeddingsCreated: 3,
        },
      };
    } catch (syncError) {
      // Update sync status to failed
      await prisma.vapiEventSettings.update({
        where: { id: eventSettings.id },
        data: { syncStatus: "failed" },
      });

      throw syncError;
    }
  } catch (error) {
    console.error("Error syncing wedding data:", error);
    return { error: "Failed to sync wedding data" };
  }
}

/**
 * Get sync status for an event
 */
export async function getSyncStatus(eventId: string) {
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

    const eventSettings = await prisma.vapiEventSettings.findUnique({
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

    if (!eventSettings) {
      return {
        success: true,
        syncStatus: null,
        lastSyncAt: null,
        embeddings: [],
        needsSync: true,
      };
    }

    // Check if data has changed since last sync
    const guestCount = await prisma.guest.count({
      where: { weddingEventId: eventId },
    });

    const lastGuestUpdate = await prisma.guest.findFirst({
      where: { weddingEventId: eventId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });

    const needsSync =
      !eventSettings.lastSyncAt ||
      (lastGuestUpdate?.updatedAt &&
        lastGuestUpdate.updatedAt > eventSettings.lastSyncAt);

    return {
      success: true,
      syncStatus: eventSettings.syncStatus,
      lastSyncAt: eventSettings.lastSyncAt,
      embeddings: eventSettings.embeddings,
      needsSync,
      guestCount,
    };
  } catch (error) {
    console.error("Error getting sync status:", error);
    return { error: "Failed to get sync status" };
  }
}

/**
 * Preview synced data for an event
 */
export async function previewSyncedData(eventId: string) {
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

    const eventSettings = await prisma.vapiEventSettings.findUnique({
      where: { weddingEventId: eventId },
    });

    if (!eventSettings) {
      return {
        success: true,
        embeddings: [],
      };
    }

    const embeddings = await prisma.vapiEmbedding.findMany({
      where: { vapiSettingsId: eventSettings.id },
    });

    const parsedEmbeddings = embeddings.map((e) => ({
      id: e.id,
      contentType: e.contentType,
      content: JSON.parse(e.content),
      updatedAt: e.updatedAt,
    }));

    return {
      success: true,
      embeddings: parsedEmbeddings,
    };
  } catch (error) {
    console.error("Error previewing synced data:", error);
    return { error: "Failed to preview synced data" };
  }
}

/**
 * Clear all synced data for an event
 */
export async function clearSyncedData(eventId: string) {
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

    const eventSettings = await prisma.vapiEventSettings.findUnique({
      where: { weddingEventId: eventId },
    });

    if (eventSettings) {
      // Delete all embeddings
      await prisma.vapiEmbedding.deleteMany({
        where: { vapiSettingsId: eventSettings.id },
      });

      // Reset sync status
      await prisma.vapiEventSettings.update({
        where: { id: eventSettings.id },
        data: {
          lastSyncAt: null,
          syncStatus: null,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error clearing synced data:", error);
    return { error: "Failed to clear synced data" };
  }
}

// ============ Helper Functions ============

/**
 * Upsert an embedding record
 */
async function upsertEmbedding(
  vapiSettingsId: string,
  contentType: string,
  content: string
) {
  const existing = await prisma.vapiEmbedding.findFirst({
    where: {
      vapiSettingsId,
      contentType,
    },
  });

  if (existing) {
    await prisma.vapiEmbedding.update({
      where: { id: existing.id },
      data: { content },
    });
  } else {
    await prisma.vapiEmbedding.create({
      data: {
        vapiSettingsId,
        contentType,
        content,
      },
    });
  }
}
